const context = {
  urlColab: null,
  setUrlColab(url) {
    this.urlColab = url;
  },
  getUrlColab() {
    return this.urlColab;
  },
};

module.exports = context;
