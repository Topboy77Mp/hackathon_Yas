// KashFlow — config Metro
// /shared est un frère de /app, hors de la racine du projet Expo : Metro doit être
// explicitement configuré pour le surveiller (sinon les imports @shared/* échouent au build).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [repoRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
