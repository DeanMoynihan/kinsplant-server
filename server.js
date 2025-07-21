const express = require("express");
const bp = require("body-parser");
const mysql = require("mysql");
const fs = require("fs");
const cors = require("cors");

var app = express();

let game_data = {
  positions: [],
  treasure: {
    objectID: "0",
    location: ["0", "0"],
  },
  player: {
    currentID: "",
    realm: "",
    sigil: "",
    job: "",
  },
  campsites: [],
  watchers: [],
  dates: [],
};

app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

app.use(cors());

app.get("/", (req, res) => {
  res.json(game_data);
});

app.get("/total", (req, res) => {
  res.json(game_data.dates.length);
});

app.get("/login/:id", (req, res) => {
  const trimGameData = {
    positions: game_data.positions,
    treasure: game_data.treasure,
    player: game_data.player,
    campsites: game_data.campsites,
    watchers: game_data.watchers,
  };
  res.json({ gameData: trimGameData, dateData: getDates(req.params.id) });
  console.log(req.params.id + " requested");
});

app.get("/dates", (req, res) => {
  const ret = game_data.dates
    .map((d) => {
      return (d.found - d.date) / 3600000;
    })
    .sort((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    })
    .map((d) => d.toFixed(2));

  res.json(ret);
});

app.get("/dates/:id", (req, res) => {
  res.json(getDates(req.params.id));
});

function getDates(id) {
  const ret = game_data.dates.filter((date) => {
    return date.id === id;
  });

  if (ret[0]) {
    return ret[0];
  }

  return null;
}

function updateDates(id) {
  const exists = game_data.dates.some((date) => {
    if (date.id === id) {
      return true;
    }

    return false;
  });

  if (exists) {
    console.log(id + " Already exists.");
    return;
  }

  const score = {
    id: id,
    date: Date.now().toString(),
    found: "",
  };

  game_data.dates.push(score);

  console.log(score.id + " added");
}

function updateFoundDate(id) {
  for (let i = 0; i < game_data.dates.length; i++) {
    if (id === game_data.dates[i].id) {
      game_data.dates[i].found = Date.now().toString();
      return;
    }
  }
}

app.post("/positions", (req, res) => {
  const post = req.body.data;
  const half = post.split("%");

  const newPlayer = half[2].split("-");

  console.log(newPlayer);

  updateDates(newPlayer[0]);
  updateFoundDate(game_data.player.currentID);

  if (game_data.player.currentID === newPlayer[0]) {
    console.log("Current Player Returning. Do Not Save.");
    //return;
  }

  game_data.player.currentID = newPlayer[0];

  game_data.player.realm = newPlayer[1];
  game_data.player.sigil = newPlayer[2];
  game_data.player.job = newPlayer[3];

  const treasure = half[1].split(",");
  game_data.treasure.location = treasure;

  const array = half[0].split("|");
  game_data.positions = array.map((i) => {
    return { position: i.split(",") };
  });

  const campsites = half[3].split("|");
  game_data.campsites = campsites.map((i) => {
    return { campsite: i.split(",") };
  });

  const watchers = half[4].split("|");
  game_data.watchers = watchers
    .map((i) => {
      const split = i.split(",");
      return {
        watcher: {
          id: split[0],
          dead: split[1],
        },
      };
    })
    .filter((w) => {
      return w.id !== "";
    });

  fs.writeFileSync(".data/game_data3", JSON.stringify(game_data));
});

app.listen(process.env.PORT, () => {
  console.log("Server started");

  if (fs.existsSync(".data/game_data3")) {
    const saveData = fs.readFileSync(".data/game_data3").toString();

    if (saveData) {
      game_data = JSON.parse(saveData);
    }
  }
});
