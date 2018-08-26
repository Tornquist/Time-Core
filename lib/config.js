'use strict';

var storedConfig = null;

module.exports = (config) => {
  if (typeof config == 'undefined') config = {};

  if (config !== null && storedConfig === null) {
    storedConfig = config
  }

  return storedConfig;
};
