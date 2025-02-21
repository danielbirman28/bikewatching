document.addEventListener('DOMContentLoaded', () => {
    const mapContainer = document.getElementById('map');

    mapboxgl.accessToken = 'pk.eyJ1IjoiZGJpcm1hbjI4IiwiYSI6ImNtN2U1djJvcjBiODMyaW9oZGYwdzQzem0ifQ.IWtjN0r4ApVyqFQF_rLiwQ';

    const map = new mapboxgl.Map({
        container: 'map', // ID of the div where the map will render
        style: 'mapbox://styles/mapbox/streets-v12', // Map style
        center: [-71.09415, 42.36027], // [longitude, latitude]
        zoom: 12, // Initial zoom level
        minZoom: 5, // Minimum allowed zoom
        maxZoom: 18  // Maximum allowed zoom
    });

    map.on('load', () => {
        // Load GeoJSON data for Boston and Cambridge bike lanes
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

        // Load the nested JSON file for bike stations
        const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json'
        d3.json(jsonurl).then(jsonData => {
            console.log('Loaded JSON Data:', jsonData);  // Log to verify structure
            const stations = jsonData.data.stations;
            console.log('Stations Array:', stations);

            // Create the SVG element in the map container if it doesn't exist
            let svg = d3.select('#map').select('svg');
            if (svg.empty()) {
                svg = d3.select('#map').append('svg');
            }

            // Create circles for each station
            const circles = svg.selectAll('circle')
                .data(stations)
                .enter()
                .append('circle')
                .attr('r', 5)               // Radius of the circle
                .attr('fill', 'steelblue')  // Circle fill color
                .attr('stroke', 'white')    // Circle border color
                .attr('stroke-width', 1)    // Circle border thickness
                .attr('opacity', 0.8);      // Circle opacity

            // Function to get projected coordinates from lat/lon
            function getCoords(station) {
                const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
                const { x, y } = map.project(point);  // Project to pixel coordinates
                return { cx: x, cy: y };  // Return as object for use in SVG attributes
            }

            // Function to update the positions of the circles based on the map's current state
            function updatePositions() {
                circles
                    .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
                    .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
            }

            // Initial position update when map loads
            updatePositions();

            // Reposition markers on map interactions
            map.on('move', updatePositions);     // Update during map movement
            map.on('zoom', updatePositions);     // Update during zooming
            map.on('resize', updatePositions);   // Update on window resize
            map.on('moveend', updatePositions);  // Final adjustment after movement ends

        }).catch(error => {
            console.error('Error loading JSON:', error);  // Handle errors if JSON loading fails
        });
    });
});
