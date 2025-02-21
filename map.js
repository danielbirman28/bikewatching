document.addEventListener('DOMContentLoaded', () => {
    const mapContainer = document.getElementById('map');

    mapboxgl.accessToken = 'pk.eyJ1IjoiZGJpcm1hbjI4IiwiYSI6ImNtN2U1djJvcjBiODMyaW9oZGYwdzQzem0ifQ.IWtjN0r4ApVyqFQF_rLiwQ';

    const map = new mapboxgl.Map({
        container: 'map', // ID of the div where the map will render
        style: 'mapbox://styles/mapbox/streets-v12', // Map style
        // style: 'mapbox://styles/mapbox/light-v11', // Map style
        center: [-71.09415, 42.36027], // [longitude, latitude]
        zoom: 12, // Initial zoom level
        minZoom: 5, // Minimum allowed zoom
        maxZoom: 18  // Maximum allowed zoom
    });

    map.on('load', () => { 
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
      });
});