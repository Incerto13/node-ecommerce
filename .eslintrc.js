module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true,
        "node": true
    },
    "extends": "airbnb-base",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "rules": {
        "arrow-body-style": 0,
        "comma-dangle": 0,
        "no-underscore-dangle": 0,
        "no-param-reassign": 0,
        "consistent-return": 0,
        "prefer-template": 0,
    }
};