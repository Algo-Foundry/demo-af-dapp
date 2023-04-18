import Vue from "vue";
import VueRouter from "vue-router";

const homeView = () => import("../views/HomeView.vue");
const asaDemoView = () => import("../views/ASADemoView.vue");

Vue.use(VueRouter);
const router = new VueRouter({
    mode: "history",
    routes: [
        {
            path: "/",
            component: homeView,
            name: "home",
        },
        {
            path: "/asa-demo",
            component: asaDemoView,
            name: "asaDemo",
        },
    ],
});

export default router;
