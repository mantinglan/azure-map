import Vue from "vue";
import App from "./App.vue";
import * as atlas from "azure-maps-control";
Vue.config.productionTip = false;
Vue.use(atlas);
new Vue({
  render: (h) => h(App)
}).$mount("#app");
