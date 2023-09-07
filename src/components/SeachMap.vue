<template>
  <div id="SearchMap">
    <div class="searchPanel">
      <div>
        <input
          id="searchTbx"
          type="search"
          v-model="searchTxt"
          @keyup.enter="searchPoi"
          placeholder="Input Text"
        />
        <button id="searchBtn" title="Search" @click="searchPoi"></button>
      </div>
    </div>
    <div id="listPanel">
      <div v-if="searchResult.length > 0">
        <div
          class="listItem"
          v-for="item in searchResult"
          :key="item.bbox"
          @click="itemClicked(item)"
          @mouseover="itemHovered(item)"
        >
          <div class="listItem-title">{{ item.properties.poi.name }}</div>
          <div class="info">
            {{
              `${item.properties.type}:${item.properties.address.freeformAddress} `
            }}
          </div>
        </div>
      </div>
    </div>
    <div class="map-wrapper">
      <div id="myMap"></div>
    </div>
    <button
      id="myLocationBtn"
      title="My Location"
      @click="setMapToUserLocation"
    ></button>
    <!-- <button @click="search">Search</button> -->
    <!-- <button @click="route">Route</button> -->
  </div>
</template>

<script>
import * as atlas from "azure-maps-control";
import * as atlasService from "azure-maps-rest";
const maxClusterZoomLevel = 11;
const clinentId = "ALw62kW5frp2GJpHANGIvriZZdLTUlZBvQvde3IBgqA";
const currentConditionsUrl = `https://atlas.microsoft.com/weather/currentConditions/json?api-version=1.0&subscription-key=${clinentId}`;
const weatherTemplate = {
  //The title tag for the popup.
  title: "Current Conditions",

  //HTML string template with placeholders for properties of the weather response.
  content:
    '<img class="weather-icon" src="/images/icons/weather-black/{iconCode}.png"/>' +
    '<div class="weather-content">' +
    '<div class="weather-temp">{temperature/value}&#176;</div>' +
    "RealFeel®: {realFeelTemperature/value}&#176;C" +
    '<div class="weather-phrase">{phrase}</div>' +
    "Humidity: {relativeHumidity}&#37</div>",

  //Format numbers with two decimal places.
  numberFormat: {
    maximumFractionDigits: 2,
  },

  //Since we trust the data being retrieve, don't sandbox the content so that we can use CSS classes.
  sandboxContent: false,
};
export default {
  data() {
    return {
      searchTxt: "",
      searchResult: [],
      map: null,
      datasource: null,
      popup: null,
      centerMarker: null,
    };
  },

  mounted() {
    console.log(atlas);
    this.initMap();
  },
  methods: {
    initMap() {
      console.log("in");
      this.map = new atlas.Map("myMap", {
        center: [-110, 50],
        zoom: 2,
        view: "Auto",
        authOptions: {
          authType: "subscriptionKey",
          subscriptionKey: clinentId,
        },
      });
      this.map.events.add("ready", () => {
        const that = this;
        this.map.setTraffic({
          incidents: true,
          flow: "relative",
        });
        // Register the map click handler
        this.datasource = new atlas.source.DataSource();
        this.map.sources.add(this.datasource);

        var resultLayer = new atlas.layer.SymbolLayer(this.datasource, null, {
          iconOptions: {
            image: "pin-round-darkblue",
            anchor: "center",
            allowOverlap: true,
          },
          textOptions: {
            anchor: "top",
          },
        });

        this.map.layers.add(resultLayer);
        this.popup = new atlas.Popup();

        //Add a mouse over event to the result layer and display a popup when this event fires.
        this.map.events.add("mouseover", resultLayer, function (e) {
          console.log(this);
          //Make sure the event occurred on a shape feature.
          if (e.shapes && e.shapes.length > 0) {
            that.showPopup(e.shapes[0]);
          }
        });

        this.map.layers.add(
          new atlas.layer.LineLayer(this.datasource, null, {
            strokeColor: "#2272B9",
            strokeWidth: 5,
            lineJoin: "round",
            lineCap: "round",
          }),
          "labels"
        );

        //Add a layer for rendering point data.
        this.map.layers.add(
          new atlas.layer.SymbolLayer(this.datasource, null, {
            iconOptions: {
              image: ["get", "icon"],
              allowOverlap: true,
            },
            textOptions: {
              textField: ["get", "title"],
              offset: [0, 1.2],
            },
            filter: [
              "any",
              ["==", ["geometry-type"], "Point"],
              ["==", ["geometry-type"], "MultiPoint"],
            ], //Only render Point or MultiPoints in this layer.
          })
        );
        //Add a zoom control to the map.
        this.map.controls.add(new atlas.control.ZoomControl(), {
          position: "top-right",
        });
        //Add an HTML marker to the map to indicate the center to use for searching.
        this.centerMarker = new atlas.HtmlMarker({
          htmlContent: '<div class="mapCenterIcon"></div>',
          position: this.map.getCamera().center,
        });

        this.map.markers.add(this.centerMarker);
        //Add a click event to the map.
        this.map.events.add("click", this.getWeatherForPoint);
      });
    },
    search() {
      //Use MapControlCredential to share authentication between a map control and the service module.
      var pipeline = atlasService.MapsURL.newPipeline(
        new atlasService.MapControlCredential(this.map)
      );

      // Construct the SearchURL object
      var searchURL = new atlasService.SearchURL(pipeline);
      var query = "gasoline-station";
      var radius = 9000;
      var lat = 47.64452336193245;
      var lon = -122.13687658309935;

      searchURL
        .searchPOI(atlasService.Aborter.timeout(10000), query, {
          limit: 10,
          lat: lat,
          lon: lon,
          radius: radius,
          view: "Auto",
        })
        .then((results) => {
          // Extract GeoJSON feature collection from the response and add it to the datasource
          var data = results.geojson.getFeatures();
          this.datasource.add(data);

          // set camera to bounds to<Your Azure Maps Subscription Key> show the results
          this.map.setCamera({
            bounds: data.bbox,
            zoom: 10,
            padding: 15,
          });
        });
    },
    searchPoi() {
      //Use MapControlCredential to share authentication between a map control and the service module.
      var pipeline = atlasService.MapsURL.newPipeline(
        new atlasService.MapControlCredential(this.map)
      );

      // Construct the SearchURL object
      var searchURL = new atlasService.SearchURL(pipeline);
      var query = this.searchTxt;
      // var radius = 9000;
      // var lat = 47.64452336193245;
      // var lon = -122.13687658309935;

      searchURL
        .searchPOI(atlasService.Aborter.timeout(10000), query, {
          lon: this.map.getCamera().center[0],
          lat: this.map.getCamera().center[1],
          maxFuzzyLevel: 4,
          view: "Auto",
        })
        .then((results) => {
          // Extract GeoJSON feature collection from the response and add it to the datasource
          var data = results.geojson.getFeatures();
          this.datasource.add(data);

          this.map.setCamera({
            bounds: data.bbox,
          });
          console.log(data);
          this.searchResult = data.features;
        });
    },
    showPopup(shape) {
      console.log({ shape });
      //Get the properties and coordinates of the first shape that the event occurred on.

      // var p = e.shapes[0].getProperties();
      // var position = e.shapes[0].getCoordinates();

      var properties = shape.getProperties();

      //Create HTML from properties of the selected result.
      var html = `
      <div style="padding:5px">
        <div><b>${properties.poi.name}</b></div>
        <div>${properties.address.freeformAddress}</div>
        <div>${properties.address.freeformAddress}</div>
      </div>`;

      //Update the content and position of the popup.
      this.popup.setPopupOptions({
        content: html,
        position: shape.getCoordinates(),
      });

      //Open the popup.
      this.popup.open(this.map);
    },
    itemHovered(item) {
      console.log("in", item);
      //Show a popup when hovering an item in the result list.
      var shape = this.datasource.getShapeById(item.id);
      console.log(shape);
      this.showPopup(shape);
    },
    itemClicked(item) {
      this.map.setCamera({
        bounds: item.bbox,
      });
    },
    setMapToUserLocation() {
      const that = this;
      //Request the user's location.
      navigator.geolocation.getCurrentPosition(
        function (position) {
          //Convert the geolocation API position into a longitude/latitude position value the map can understand and center the map over it.
          that.map.setCamera({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: maxClusterZoomLevel + 1,
          });
        },
        function (error) {
          //If an error occurs when trying to access the users position information, display an error message.
          switch (error.code) {
            case error.PERMISSION_DENIED:
              alert("User denied the request for geolocation.");
              break;
            case error.POSITION_UNAVAILABLE:
              alert("Position information is unavailable.");
              break;
            case error.TIMEOUT:
              alert("The request to get user position timed out.");
              break;
            case error.UNKNOWN_ERROR:
              alert("An unknown error occurred.");
              break;
          }
        }
      );
    },
    route() {
      //Create the GeoJSON objects which represent the start and end points of the route.
      var startPoint = new atlas.data.Feature(
        new atlas.data.Point([-122.356099, 47.580045]),
        {
          title: "Redmond",
          icon: "pin-blue",
        }
      );

      var endPoint = new atlas.data.Feature(
        new atlas.data.Point([-122.201164, 47.61694]),
        {
          title: "Seattle",
          icon: "pin-round-blue",
        }
      );

      //Add the data to the data source.
      this.datasource.add([startPoint, endPoint]);

      this.map.setCamera({
        bounds: atlas.data.BoundingBox.fromData([startPoint, endPoint]),
        padding: 80,
      });
      //Use MapControlCredential to share authentication between a map control and the service module.
      var pipeline = atlasService.MapsURL.newPipeline(
        new atlasService.MapControlCredential(this.map)
      );

      //Construct the RouteURL object
      var routeURL = new atlasService.RouteURL(pipeline);
      //Start and end point input to the routeURL
      var coordinates = [
        [
          startPoint.geometry.coordinates[0],
          startPoint.geometry.coordinates[1],
        ],
        [endPoint.geometry.coordinates[0], endPoint.geometry.coordinates[1]],
      ];

      //Make a search route request
      routeURL
        .calculateRouteDirections(
          atlasService.Aborter.timeout(10000),
          coordinates
        )
        .then((directions) => {
          //Get data features from response
          var data = directions.geojson.getFeatures();
          this.datasource.add(data);
        });
    },
    getWeatherForPoint(e) {
      //Close the popup if it is open.
      this.popup.close();

      //Request the current conditions weather data and show it in the pop up.
      var requestUrl = `${currentConditionsUrl}&query=${e.position[1]},${e.position[0]}`;

      this.$ajax.get(requestUrl).then((response) => {
        // processRequest(requestUrl).then((response) => {
        var content;
        if (
          response.data &&
          response.data.results &&
          response.data.results[0]
        ) {
          //Use the weatherTemplate settings to create templated content for the popup.
          content = atlas.PopupTemplate.applyTemplate(
            response.data.results[0],
            weatherTemplate
          );
        } else {
          content =
            '<div style="padding:10px;">Weather data not available for this location.</div>';
        }

        this.popup.setOptions({
          content: content,
          position: e.position,
        });

        this.popup.open(this.map);
      });
    },
  },
  components: {
    // SeachMap,
  },
};
</script>

<style scoped>
/* @import "azure-maps-control/dist/atlas.min.css"; */
#SearchMap {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
}
.search {
  width: 400px;
  position: absolute;
  z-index: 2000;
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
}
.searchPanel {
  position: relative;
  width: 350px;
  height: 80px;
  flex-basis: 30%;
  width: 40%;
  order: 0;
}

.searchPanel div {
  padding: 20px;
  display: flex;
}

.searchPanel input {
  width: calc(100% - 50px);
  font-size: 16px;
  border: 0;
  border-bottom: 1px solid #ccc;
}
.map-wrapper {
  flex-basis: 100%;
  width: 60%;
}
#listPanel {
  /* position: absolute;
  top: 80px;
  left: 0px; */
  width: 350px;
  height: calc(100vh - 80px);
  overflow-y: auto;
  flex-basis: 50%;
  width: 40%;
  order: 0;
}
#myMap {
  /* position: absolute;
  top: 0;
  left: 350px; */
  /* width: calc(100vw - 350px); */
  width: 100%;
  height: 100%;
}
#results-panel {
  list-style: none;
  overflow-y: auto;
  max-height: calc(100vh - 119px);
}
#results-panel > li {
  border-top: 1px dotted #ccc;
  padding: 10px 20px;
}
#myLocationBtn,
#searchBtn {
  margin: 0;
  padding: 0;
  border: none;
  border-collapse: collapse;
  width: 32px;
  height: 32px;
  text-align: center;
  cursor: pointer;
  line-height: 32px;
  background-repeat: no-repeat;
  background-size: 20px;
  background-position: center center;
  z-index: 200;
}
#myLocationBtn {
  position: absolute;
  top: 150px;
  right: 10px;
  box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.16);
  background-color: white;
  background-image: url("../assets/images/GpsIcon.png");
}

#myLocationBtn:hover {
  background-image: url("../assets/images/GpsIcon-hover.png");
}
#searchBtn {
  background-color: transparent;
  background-image: url("../assets/images/SearchIcon.png");
}

#searchBtn:hover {
  background-image: url("../assets/images/SearchIcon-hover.png");
} /* Adjust the layout of the page when the screen width is fewer than 700 pixels. */
.listItem {
  height: 50px;
  padding: 20px;
  font-size: 14px;
}

.listItem:hover {
  cursor: pointer;
  background-color: #f1f1f1;
}

.listItem-title {
  color: #007faa;
  font-weight: bold;
}
@media screen and (max-width: 700px) {
  #SearchMap {
    flex-wrap: nowrap;
  }
  .searchPanel {
    width: 100%;
    order: 0;
  }

  #listPanel {
    /* top: 385px; */
    position: relative;
    width: 100%;
    height: calc(100vh - 385px);
    order: 3;
  }
  .map-wrapper {
    width: 100%;
    order: 2;
  }

  #myMap {
    width: 100%;
    /* height: 250px; */
  }

  #myLocationBtn {
    top: 220px;
  }
}
</style>
