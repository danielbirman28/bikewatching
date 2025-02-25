document.addEventListener('DOMContentLoaded', () => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZGJpcm1hbjI4IiwiYSI6ImNtN2U1djJvcjBiODMyaW9oZGYwdzQzem0ifQ.IWtjN0r4ApVyqFQF_rLiwQ';

    const mapContainer = document.getElementById('map');
    mapContainer.innerHTML = '';  // Ensure the container is empty

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-71.09415, 42.36027],
        zoom: 12,
        minZoom: 5,
        maxZoom: 18
    });

    map.on('load', () => {
        const stationUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
        const tripUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';

        Promise.all([d3.json(stationUrl), d3.csv(tripUrl)]).then(([stationData, tripData]) => {
            map.addSource('boston_route', {
                type: 'geojson',
                data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
            });
    
            map.addSource('cambridge_route', {
                type: 'geojson',
                data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
            });
            
            map.addLayer({
                id: 'bike-lanes-boston',
                type: 'line',
                source: 'boston_route',
                paint: {
                    'line-color': 'green',
                    'line-width': 3,
                    'line-opacity': 0.4
                }
            });
    
            map.addLayer({
                id: 'bike-lanes-cambridge',
                type: 'line',
                source: 'cambridge_route',
                paint: {
                    'line-color': 'green',
                    'line-width': 3,
                    'line-opacity': 0.4
                }
            });

            let stations = stationData.data.stations;

            let arrivals = d3.rollup(tripData, v => v.length, d => d.end_station_id);
            let departures = d3.rollup(tripData, v => v.length, d => d.start_station_id);

            stations = stations.map(station => {
                let id = station.short_name;
                station.arrivals = arrivals.get(id) ?? 0;
                station.departures = departures.get(id) ?? 0;
                station.totalTraffic = station.arrivals + station.departures;
                return station;
            });

            console.log('Updated Stations with Traffic Data:', stations);

            // Create a scale to map total traffic to circle radius
            const radiusScale = d3.scaleSqrt()
                .domain([0, d3.max(stations, d => d.totalTraffic)])
                .range([0, 25]);

            // Create an overlay for SVG elements
            let svgOverlay = document.getElementById('svg-overlay');
            if (!svgOverlay) {
                svgOverlay = document.createElement('div');
                svgOverlay.id = 'svg-overlay';
                svgOverlay.style.position = 'absolute';
                svgOverlay.style.top = '0';
                svgOverlay.style.left = '0';
                svgOverlay.style.width = '100%';
                svgOverlay.style.height = '100%';
                svgOverlay.style.pointerEvents = 'none';
                mapContainer.appendChild(svgOverlay);
            }

            let svg = d3.select('#svg-overlay').select('svg');
            if (svg.empty()) {
                svg = d3.select('#svg-overlay').append('svg')
                    .attr('width', '100%')
                    .attr('height', '100%')
                    .style('position', 'absolute');
            }

            const circles = svg.selectAll('circle')
                .data(stations)
                .enter()
                .append('circle')
                .attr('class', 'station-circle') // Assign a class for styling
                .attr('r', d => radiusScale(d.totalTraffic))
                .each(function(d) {
                    // Append a <title> element inside each circle for tooltip
                    d3.select(this)
                    .append('title')
                    .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
            });


            function getCoords(station) {
                const point = new mapboxgl.LngLat(+station.lon, +station.lat);
                const { x, y } = map.project(point);
                return { cx: x, cy: y };
            }

            function updatePositions() {
                circles
                    .attr('cx', d => getCoords(d).cx)
                    .attr('cy', d => getCoords(d).cy);
            }

            updatePositions();
            map.on('move', updatePositions);
            map.on('zoom', updatePositions);
            map.on('resize', updatePositions);
            map.on('moveend', updatePositions);

        }).catch(error => {
            console.error('Error loading data:', error);
        });
    });
});
