import { App } from "./app/App";
import "./styles/global.css";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Element #app introuvable");
}

new App(root).mount();
