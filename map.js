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

    // Compute station traffic
    function computeStationTraffic(stations, trips) {
        const arrivals = d3.rollup(trips, (v) => v.length, (d) => d.end_station_id);
        const departures = d3.rollup(trips, (v) => v.length, (d) => d.start_station_id);

        return stations.map((station) => {
            const id = station.short_name;
            station.arrivals = arrivals.get(id) ?? 0;
            station.departures = departures.get(id) ?? 0;
            station.totalTraffic = station.arrivals + station.departures;
            return station;
        });
    }

    map.on('load', async () => {
        const stationUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
        const tripUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';

        const [stationData, tripData] = await Promise.all([
            d3.json(stationUrl),
            d3.csv(tripUrl, (trip) => {
                trip.started_at = new Date(trip.started_at);
                trip.ended_at = new Date(trip.ended_at);
                return trip;
            })
        ]);

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
        let trips = tripData;
        let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

        stations = computeStationTraffic(stations, trips);  // Initial computation

        // Create a scale to map total traffic to circle radius
        const radiusScale = d3.scaleSqrt()
            .domain([0, d3.max(stations, (d) => d.totalTraffic)])
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

        // Create the circles and bind data
        const circles = svg
            .selectAll('circle')
            .data(stations, (d) => d.short_name)  // Use station short_name as the key
            .enter()
            .append('circle')
            .attr('class', 'station-circle')
            .attr('r', (d) => radiusScale(d.totalTraffic))
            .style("--departure-ratio", d => stationFlow(d.departures / d.totalTraffic));

        function getCoords(station) {
            const point = new mapboxgl.LngLat(+station.lon, +station.lat);
            const { x, y } = map.project(point);
            return { cx: x, cy: y };
        }

        function updatePositions() {
            circles
                .attr('cx', (d) => getCoords(d).cx)
                .attr('cy', (d) => getCoords(d).cy);
        }

        updatePositions();
        map.on('move', updatePositions);
        map.on('zoom', updatePositions);
        map.on('resize', updatePositions);
        map.on('moveend', updatePositions);

        // Create a tooltip element above the map and outside of the SVG
        const tooltip = d3.select(mapContainer)
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background-color', 'rgba(0, 0, 0, 0.7)')
            .style('color', 'white')
            .style('border-radius', '5px')
            .style('padding', '10px')
            .style('visibility', 'hidden')
            .style('pointer-events', 'none')
            .style('z-index', '999'); // Ensure it's above all map layers

        // Show tooltip on hover
        circles.on('mouseover', function (event, d) {
            // Get the coordinates of the circle relative to the map
            const coords = getCoords(d);  // Get coordinates based on the station
            const circleRadius = radiusScale(d.totalTraffic);  // Get the radius of the circle

            tooltip.style('visibility', 'visible')
                .html(`
                    <strong>Station:</strong> ${d.short_name}<br/>
                    <strong>Total Traffic:</strong> ${d.totalTraffic}<br/>
                    <strong>Arrivals:</strong> ${d.arrivals}<br/>
                    <strong>Departures:</strong> ${d.departures}
                `);

            // Position the tooltip above the circle
            let tooltipTop = coords.cy - circleRadius - 10;  // Position above the circle
            let tooltipLeft = coords.cx + circleRadius + 10;  // Position to the right of the circle

            // Check if the tooltip goes off-screen (top of the map)
            if (tooltipTop < 0) {
                tooltipTop = coords.cy + circleRadius + 10;  // Position below the circle if it would go off-screen
            }

            // Check if the tooltip goes off-screen (left side of the map)
            if (tooltipLeft < 0) {
                tooltipLeft = 10;  // Give some padding from the left edge
            }

            // Check if the tooltip goes off-screen (right side of the map)
            const maxTooltipLeft = mapContainer.offsetWidth - tooltip.node().offsetWidth;
            if (tooltipLeft > maxTooltipLeft) {
                tooltipLeft = maxTooltipLeft - 10;  // Give some padding from the right edge
            }

            // Set the tooltip position
            tooltip.style('top', tooltipTop + 'px')
                .style('left', tooltipLeft + 'px');
        })
        .on('mouseout', function () {
            tooltip.style('visibility', 'hidden');  // Hide the tooltip when mouse leaves
        });

        // Time slider functionality
        const timeSlider = document.getElementById('time-slider');
        const selectedTime = document.getElementById('selected-time');
        const anyTimeLabel = document.getElementById('any-time');
        let timeFilter = -1;  // Default to no filter

        function formatTime(minutes) {
            const date = new Date(0, 0, 0, 0, minutes);  // Set hours & minutes
            return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
        }

        function minutesSinceMidnight(date) {
            return date.getHours() * 60 + date.getMinutes();
        }

        function filterTripsbyTime(trips, timeFilter) {
            return timeFilter === -1
                ? trips // If no filter is applied (-1), return all trips
                : trips.filter((trip) => {
                    const startedMinutes = minutesSinceMidnight(trip.started_at);
                    const endedMinutes = minutesSinceMidnight(trip.ended_at);

                    return (
                        Math.abs(startedMinutes - timeFilter) <= 60 ||
                        Math.abs(endedMinutes - timeFilter) <= 60
                    );
                });
        }

        function updateScatterPlot(timeFilter) {
            const filteredTrips = filterTripsbyTime(trips, timeFilter);
            const filteredStations = computeStationTraffic(stations, filteredTrips);

            // Dynamically update radiusScale based on timeFilter
            radiusScale.range(timeFilter === -1 ? [0, 25] : [3, 50]);

            // Update circles based on filtered data
            circles
                .data(filteredStations, (d) => d.short_name)
                .join('circle')
                .attr('r', (d) => radiusScale(d.totalTraffic))
                .style('--departure-ratio', (d) =>
                    stationFlow(d.departures / d.totalTraffic),
                  );
        }

        function updateTimeDisplay() {
            timeFilter = Number(timeSlider.value); // Get slider value

            if (timeFilter === -1) {
                selectedTime.textContent = ''; // Clear time display
                anyTimeLabel.style.display = 'block'; // Show "(any time)"
            } else {
                selectedTime.textContent = formatTime(timeFilter); // Display formatted time
                anyTimeLabel.style.display = 'none'; // Hide "(any time)"
            }

            // Call updateScatterPlot to reflect the changes on the map
            updateScatterPlot(timeFilter);
        }

        timeSlider.addEventListener('input', updateTimeDisplay);
        updateTimeDisplay();  // Initialize time display when the map loads
    });
});
