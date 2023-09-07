<template>
  <div id="app">
    <div class="search">
      <input type="text" v-model="searchTxt" @keyup.enter="searchPoi" />
      <div v-if="searchResult.length > 0">
        <ul id="results-panel">
          <li
            v-for="item in searchResult"
            :key="item.bbox"
            @click="itemClicked(item.properties.id)"
          >
            <div class="title">{{ item.properties.poi.name }}</div>
            <div class="info">
              {{
                `${item.properties.type}:${item.properties.address.freeformAddress} `
              }}
            </div>
          </li>
        </ul>
      </div>
    </div>
    <div id="map" style="width: 100vw; height: 80vh"></div>
    <!-- <button @click="search">Search</button> -->
    <button @click="route">Route</button>
    <!-- <SeachMap></SeachMap> -->
  </div>
</template>

<script>
import * as atlas from "azure-maps-control";
import * as atlasService from "azure-maps-rest";
// import SeachMap from "./components/SeachMap";
export default {
  name: "app",
  data: () => ({
    searchTxt: "",
    searchResult: [],
    map: null,
    datasource: null,
    popup: null,
  }),
  mounted() {
    console.log(atlas);
    this.initMap();
  },
  methods: {
    initMap() {
      console.log("in");
      this.map = new atlas.Map("map", {
        center: [-110, 50],
        zoom: 2,
        view: "Auto",
        authOptions: {
          authType: "subscriptionKey",
          subscriptionKey: "ALw62kW5frp2GJpHANGIvriZZdLTUlZBvQvde3IBgqA",
        },
      });
      this.map.events.add("ready", () => {
        // this.map.setTraffic({
        //   flow: "relative",
        // });
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
        this.map.events.add("mouseover", resultLayer, this.showPopup);

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
    showPopup(e) {
      //Get the properties and coordinates of the first shape that the event occurred on.

      var p = e.shapes[0].getProperties();
      var position = e.shapes[0].getCoordinates();

      //Create HTML from properties of the selected result.
      var html = `
      <div style="padding:5px">
        <div><b>${p.poi.name}</b></div>
        <div>${p.address.freeformAddress}</div>
        <div>${position[1]}, ${position[0]}</div>
      </div>`;

      //Update the content and position of the popup.
      this.popup.setPopupOptions({
        content: html,
        position: position,
      });

      //Open the popup.
      this.popup.open(this.map);
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
  },
  components: {
    // SeachMap,
  },
};
</script>

<style>
/* @import '../node_modules/azure-maps-control/dist/atlas.min.css'; */
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  /* margin-top: 60px; */
}
#myMap {
  width: 100vh;
  height: 100%;
}
.search {
  width: 400px;
  position: absolute;
  z-index: 2000;
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
}
#results-panel {
  list-style: none;
}
#results-panel > li {
  border-top: 1px dotted #ccc;
  padding: 10px 20px;
}
</style>
