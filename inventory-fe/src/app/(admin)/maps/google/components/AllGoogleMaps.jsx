import { useState } from 'react';
import { Row, Col } from 'react-bootstrap';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import UIExamplesList from '@/components/UIExamplesList';
import { GoogleMap, LoadScript, Marker, InfoWindow, Polyline, StreetViewPanorama } from '@react-google-maps/api';
const containerStyle = {
  width: '100%',
  height: '400px'
};
const basicCenter = {
  lat: 21.569874,
  lng: 71.5893798
};
const streetViewCenter = {
  lat: 40.7295174,
  lng: -73.9986496
};
const lightMapCenter = {
  lat: -12.043333,
  lng: -77.028333
};
const darkMapCenter = {
  lat: -12.043333,
  lng: -77.028333
};
const polylinePath = [{
  lat: 37.789411,
  lng: -122.422116
}, {
  lat: 37.785757,
  lng: -122.421333
}, {
  lat: 37.789352,
  lng: -122.415346
}];
const lightMapStyle = [{
  featureType: 'water',
  elementType: 'geometry',
  stylers: [{
    color: '#e9e9e9'
  }, {
    lightness: 17
  }]
}, {
  featureType: 'landscape',
  elementType: 'geometry',
  stylers: [{
    color: '#f5f5f5'
  }, {
    lightness: 20
  }]
}, {
  featureType: 'road.highway',
  elementType: 'geometry.fill',
  stylers: [{
    color: '#ffffff'
  }, {
    lightness: 17
  }]
}, {
  featureType: 'road.highway',
  elementType: 'geometry.stroke',
  stylers: [{
    color: '#ffffff'
  }, {
    lightness: 29
  }, {
    weight: 0.2
  }]
}, {
  featureType: 'road.arterial',
  elementType: 'geometry',
  stylers: [{
    color: '#ffffff'
  }, {
    lightness: 18
  }]
}, {
  featureType: 'road.local',
  elementType: 'geometry',
  stylers: [{
    color: '#ffffff'
  }, {
    lightness: 16
  }]
}, {
  featureType: 'poi',
  elementType: 'geometry',
  stylers: [{
    color: '#f5f5f5'
  }, {
    lightness: 21
  }]
}, {
  featureType: 'poi.park',
  elementType: 'geometry',
  stylers: [{
    color: '#dedede'
  }, {
    lightness: 21
  }]
}, {
  elementType: 'labels.text.stroke',
  stylers: [{
    visibility: 'on'
  }, {
    color: '#ffffff'
  }, {
    lightness: 16
  }]
}, {
  elementType: 'labels.text.fill',
  stylers: [{
    saturation: 36
  }, {
    color: '#333333'
  }, {
    lightness: 40
  }]
}, {
  elementType: 'labels.icon',
  stylers: [{
    visibility: 'off'
  }]
}];

// Dark map style
const darkMapStyle = [{
  featureType: 'all',
  elementType: 'labels',
  stylers: [{
    visibility: 'on'
  }]
}, {
  featureType: 'all',
  elementType: 'labels.text.fill',
  stylers: [{
    saturation: 36
  }, {
    color: '#000000'
  }, {
    lightness: 40
  }]
}, {
  featureType: 'all',
  elementType: 'labels.text.stroke',
  stylers: [{
    visibility: 'on'
  }, {
    color: '#000000'
  }, {
    lightness: 16
  }]
}, {
  featureType: 'all',
  elementType: 'labels.icon',
  stylers: [{
    visibility: 'off'
  }]
}, {
  featureType: 'landscape',
  elementType: 'geometry',
  stylers: [{
    color: '#000000'
  }, {
    lightness: 20
  }]
}, {
  featureType: 'poi',
  elementType: 'geometry',
  stylers: [{
    color: '#000000'
  }, {
    lightness: 21
  }]
}, {
  featureType: 'road.highway',
  elementType: 'geometry.fill',
  stylers: [{
    color: '#e5c163'
  }, {
    lightness: 0
  }]
}, {
  featureType: 'road.arterial',
  elementType: 'geometry',
  stylers: [{
    color: '#000000'
  }, {
    lightness: 18
  }]
}, {
  featureType: 'road.local',
  elementType: 'geometry',
  stylers: [{
    color: '#000000'
  }, {
    lightness: 16
  }]
}, {
  featureType: 'water',
  elementType: 'geometry',
  stylers: [{
    color: '#000000'
  }, {
    lightness: 17
  }]
}];
const AllGoogleMaps = () => {
  const [activeMarker, setActiveMarker] = useState(null);
  return <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <Row>
        <Col xl={9}>
          <ComponentContainerCard id="basic_google_map" title="Basic Example" description="Basic Google Map example">
            <GoogleMap mapContainerStyle={containerStyle} center={basicCenter} zoom={14} />
          </ComponentContainerCard>

          <ComponentContainerCard id="google_map" title="Markers Google Map" description="Map with markers and InfoWindow">
            <GoogleMap mapContainerStyle={containerStyle} center={basicCenter} zoom={18}>
              <Marker position={basicCenter} onClick={() => setActiveMarker(0)} title="Home sweet home!" />
              <Marker position={{
              lat: 21.56969,
              lng: 71.5893798
            }} onClick={() => setActiveMarker(1)} title="Current Location" />
              {activeMarker === 0 && <InfoWindow position={basicCenter} onCloseClick={() => setActiveMarker(null)}>
                  <div>Home sweet home!</div>
                </InfoWindow>}
              {activeMarker === 1 && <InfoWindow position={{
              lat: 21.56969,
              lng: 71.5893798
            }} onCloseClick={() => setActiveMarker(null)}>
                  <div>Current Location</div>
                </InfoWindow>}
            </GoogleMap>
          </ComponentContainerCard>

          <ComponentContainerCard id="street_view" title="Street View Panoramas" description="Street view example">
            <GoogleMap mapContainerStyle={containerStyle} center={streetViewCenter} zoom={14}>
              <StreetViewPanorama options={{
              position: streetViewCenter,
              pov: {
                heading: 100,
                pitch: 0
              },
              visible: true
            }} />
            </GoogleMap>
          </ComponentContainerCard>

          <ComponentContainerCard id="poly_line" title="PolyLine Google Map" description="Polyline example">
            <GoogleMap mapContainerStyle={containerStyle} center={polylinePath[0]} zoom={14}>
              <Polyline path={polylinePath} options={{
              strokeColor: '#0000FF',
              strokeOpacity: 0.8,
              strokeWeight: 2
            }} />
            </GoogleMap>
          </ComponentContainerCard>

          <ComponentContainerCard id="ultra_light" title="Ultra Light With Labels" description="Light styled map">
            <GoogleMap mapContainerStyle={containerStyle} center={lightMapCenter} zoom={14} options={{
            styles: lightMapStyle
          }} />
          </ComponentContainerCard>

          <ComponentContainerCard id="dark_view" title="Dark" description="Dark styled map">
            <GoogleMap mapContainerStyle={containerStyle} center={darkMapCenter} zoom={14} options={{
            styles: darkMapStyle
          }} />
          </ComponentContainerCard>
        </Col>

        <Col xl={3}>
          <UIExamplesList examples={[{
          link: '#basic_google_map',
          label: 'Basic'
        }, {
          link: '#google_map',
          label: 'Markers Google Map'
        }, {
          link: '#street_view',
          label: 'Street View Panoramas Google Map'
        }, {
          link: '#poly_line',
          label: 'PolyLine Google Map'
        }, {
          link: '#ultra_light',
          label: 'Ultra Light With Labels'
        }, {
          link: '#dark_view',
          label: 'Dark'
        }]} />
        </Col>
      </Row>
    </LoadScript>;
};
export default AllGoogleMaps;