const axios = require("axios");

const getNgrokUrl = async (url) => {
  try {
    const res = await axios.get(url);
    return res.data.url;
  } catch (error) {
    console.log("error getNgrokUrl: ", error);
  }
};

module.exports = {
  getNgrokUrl,
};
