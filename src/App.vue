<template>
  <div id="app">
    <SeachMap></SeachMap>
  </div>
</template>

<script>
import SeachMap from "./components/SeachMap";
export default {
  name: "app",
  data: () => ({
    searchTxt: "",
    searchResult: [],
    map: null,
    datasource: null,
    popup: null,
  }),
  mounted() {},
  methods: {},
  components: {
    SeachMap,
  },
};
</script>

<style>
/* @import '../node_modules/azure-maps-control/dist/atlas.min.css'; */
html,
body {
  padding: 0;
  margin: 0;
  font-family: Gotham, Helvetica, sans-serif;
  overflow-x: hidden;
}
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  /* margin-top: 60px; */
  overflow: hidden;
  height: 100vh;
  width: 100vw;
}
</style>
