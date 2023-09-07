import Vue from "vue";
import App from "./App.vue";
import axios from 'axios';
import * as atlasCss from '../node_modules/azure-maps-control/dist/atlas.min.css';
Vue.config.productionTip = false;
Vue.prototype.$ajax= axios
Vue.use(atlasCss)
new Vue({
  render: (h) => h(App)
}).$mount("#app");
