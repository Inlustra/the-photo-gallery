import { watch } from "chokidar";
import axios from "axios";

const watcher = watch("./public/photos", {
  ignored: /^\./,
  persistent: true,
});

function debounce(inner, ms = 1000) {
  let timer = null;
  let resolves = [];

  return function (...args) {
    // Run the function after a certain amount of time
    clearTimeout(timer);
    timer = setTimeout(() => {
      // Get the result of the inner function, then apply it to the resolve function of
      // each promise that has been created since the last time the inner function was run
      let result = inner(...args);
      resolves.forEach((r) => r(result));
      resolves = [];
    }, ms);

    return new Promise((r) => resolves.push(r));
  };
}

const secret = process.env.REGEN_SECRET;
const regenURL = process.env.REGEN_URL ?? "http://0.0.0.0:3000/api/regen";
function regen() {
  const url = `${regenURL}${secret ? `?secret=${secret}` : ""}`;
  console.log(`Regenerating: ${url}`);
  axios({
    method: "get",
    url,
  })
    .then(function (response) {
      console.log(`Regeneration complete ${response.status}`);
    })
    .catch(function (error) {
      console.error("Error regenerating...");
      console.error(error.message);
    });
}

const debouncedRegen = debounce(regen);
watcher
  .on("add", debouncedRegen)
  .on("change", debouncedRegen)
  .on("unlink", debouncedRegen)
  .on("error", debouncedRegen);
