<template>
  <div>
    <div>
      <div class="searchPanel">
        <div>
          <input
            id="searchTbx"
            v-model="searchStr"
            type="search"
            placeholder="Find a store"
          />
          <button id="searchBtn" title="Search" @click="performSearch">
            Search
          </button>
        </div>
      </div>

      <div id="listPanel">
        <div v-for="item in searchResult">
          {{ item }}
        </div>
      </div>

      <div id="myMap"></div>

      <button
        id="myLocationBtn"
        @click="setMapToUserLocation"
        tle="My Location"
      >
        +
      </button>
    </div>
  </div>
</template>

<script>
import * as atlas from "azure-maps-control";
import * as atlasService from "azure-maps-rest";
var maxClusterZoomLevel = 11;
var storeLocationDataUrl = "../data/ContosoCoffee.txt";
var iconImageUrl = "/tutorials/simple-store-locator/images/CoffeeIcon.png";
var countrySet = ["US", "CA", "GB", "FR", "DE", "IT", "ES", "NL", "DK"];
export default {
  data() {
    return {
      searchStr: "",
      searchResult: [],
      map: null,
      popup: null,
      centerMarker: null,
      searchURL: "",
    };
  },
  mounted() {
    this.initialize();
  },
  methods: {
    initialize() {
      console.log("in");
      this.map = new atlas.Map("myMap", {
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

        var pipeline = atlasService.MapsURL.newPipeline(
          new atlasService.MapControlCredential(this.map)
        );

        // Construct the SearchURL object
        this.searchURL = new atlasService.SearchURL(pipeline);
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
    showPopup(e) {
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
    loadStoreData() {
      //Download the store location data.
      fetch(storeLocationDataUrl)
        .then((response) => response.text())
        .then(function (text) {
          //Parse the Tab delimited file data into GeoJSON features.
          var features = [];

          //Split the lines of the file.
          var lines = text.split("\n");

          //Grab the header row.
          var row = lines[0].split("\t");

          //Parse the header row and index each column, so that when our code for parsing each row is easier to follow.
          var header = {};
          var numColumns = row.length;
          var i;

          for (i = 0; i < row.length; i++) {
            header[row[i]] = i;
          }

          //Skip the header row and then parse each row into a GeoJSON feature.
          for (i = 1; i < lines.length; i++) {
            row = lines[i].split("\t");

            //Ensure that the row has the right number of columns.
            if (row.length >= numColumns) {
              features.push(
                new atlas.data.Feature(
                  new atlas.data.Point([
                    parseFloat(row[header["Longitude"]]),
                    parseFloat(row[header["Latitude"]]),
                  ]),
                  {
                    AddressLine: row[header["AddressLine"]],
                    City: row[header["City"]],
                    Municipality: row[header["Municipality"]],
                    AdminDivision: row[header["AdminDivision"]],
                    Country: row[header["Country"]],
                    PostCode: row[header["PostCode"]],
                    Phone: row[header["Phone"]],
                    StoreType: row[header["StoreType"]],
                    IsWiFiHotSpot:
                      row[header["IsWiFiHotSpot"]].toLowerCase() === "true"
                        ? true
                        : false,
                    IsWheelchairAccessible:
                      row[header["IsWheelchairAccessible"]].toLowerCase() ===
                      "true"
                        ? true
                        : false,
                    Opens: parseInt(row[header["Opens"]]),
                    Closes: parseInt(row[header["Closes"]]),
                  }
                )
              );
            }
          }

          //Add the features to the data source.
          this.datasource.add(features);

          //Initially update the list items.
          this.updateListItems();
        });
    },
    performSearch() {
      var query = this.searchStr;
      var radius = 9000;
      var lat = 47.64452336193245;
      var lon = -122.13687658309935;

      //Perform a fuzzy search on the users query.
      this.searchURL
        .searchPOI(atlasService.Aborter.timeout(3000), query, {
          limit: 10,
          lat: lat,
          lon: lon,
          radius: radius,
          view: "Auto",
        })
        .then((results) => {
          console.log(results.results);
          //Parse the response into GeoJSON so that the map can understand.
          var data = results.geojson.getFeatures();
          this.datasource.add(data);

          // set camera to bounds to<Your Azure Maps Subscription Key> show the results
          this.map.setCamera({
            bounds: data.bbox,
            zoom: 10,
            padding: 15,
          });
          if (results.results.length > 0) {
            //Set the camera to the bounds of the results.
            this.map.setCamera({
              bounds: data.bbox,
              padding: 40,
            });
            this.searchResult = results.results;
          } else {
            document.getElementById("listPanel").innerHTML =
              '<div class="statusMessage">Unable to find the location you searched for.</div>';
          }
        });
    },

    setMapToUserLocation() {
      //Request the user's location.
      navigator.geolocation.getCurrentPosition(
        function (position) {
          //Convert the geolocation API position into a longitude/latitude position value the map can understand and center the map over it.
          this.map.setCamera({
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
            default:
              alert("Other error occurred.");
              break;
          }
        }
      );
    },

    //Initialize the application when the page is loaded.
  },
};
</script>

<style scoped>
/* @import "azure-maps-control/dist/atlas.min.css"; */

header {
  width: calc(100vw - 10px);
  height: 30px;
  padding: 15px 0 20px 20px;
  font-size: 25px;
  font-style: italic;
  font-family: "Comic Sans MS", cursive, sans-serif;
  line-height: 30px;
  font-weight: bold;
  color: white;
  background-color: #007faa;
}

header span {
  vertical-align: middle;
}

header img {
  height: 30px;
  vertical-align: middle;
}

.searchPanel {
  position: relative;
  width: 350px;
}

.searchPanel div {
  padding: 20px;
}

.searchPanel input {
  width: calc(100% - 50px);
  font-size: 16px;
  border: 0;
  border-bottom: 1px solid #ccc;
}

#listPanel {
  position: absolute;
  top: 135px;
  left: 0px;
  width: 350px;
  height: calc(100vh - 135px);
  overflow-y: auto;
}

#myMap {
  position: absolute;
  top: 65px;
  left: 350px;
  width: calc(100vw - 350px);
  height: calc(100vh - 65px);
}

.statusMessage {
  margin: 10px;
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
  /* background-image: url("images/GpsIcon.png"); */
}

#myLocationBtn:hover {
  /* background-image: url("images/GpsIcon-hover.png"); */
}

#searchBtn {
  background-color: transparent;
  /* background-image: url("images/SearchIcon.png"); */
}

#searchBtn:hover {
  /* background-image: url("images/SearchIcon-hover.png"); */
}

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

.storePopup {
  min-width: 150px;
}

.storePopup .popupTitle {
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  padding: 8px;
  height: 30px;
  background-color: #007faa;
  color: white;
  font-weight: bold;
}

.storePopup .popupSubTitle {
  font-size: 10px;
  line-height: 12px;
}

.storePopup .popupContent {
  font-size: 11px;
  line-height: 18px;
  padding: 8px;
}

.storePopup img {
  vertical-align: middle;
  height: 12px;
  margin-right: 5px;
}

/* Adjust the layout of the page when the screen width is fewer than 700 pixels. */
@media screen and (max-width: 700px) {
  .searchPanel {
    width: 100vw;
  }

  #listPanel {
    top: 385px;
    width: 100%;
    height: calc(100vh - 385px);
  }

  #myMap {
    width: 100vw;
    height: 250px;
    top: 135px;
    left: 0px;
  }

  #myLocationBtn {
    top: 220px;
  }
}

.mapCenterIcon {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: orange;
  border: 2px solid white;
  cursor: pointer;
  box-shadow: 0 0 0 rgba(0, 204, 255, 0.4);
  animation: pulse 3s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 204, 255, 0.4);
  }

  70% {
    box-shadow: 0 0 0 50px rgba(0, 204, 255, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(0, 204, 255, 0);
  }
}
</style>