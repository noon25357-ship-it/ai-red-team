// Shared brand kit used by the local template skills.
export const PALETTES = [
  { name: "Night Oud", bg: "#0b0a10", accent: "#c9a45c", soft: "#3a2f1f", text: "#f4ead7" },
  { name: "Desert Rose", bg: "#140b0e", accent: "#d8a48f", soft: "#4a2630", text: "#f7e9e4" },
  { name: "Royal Amber", bg: "#0d0b06", accent: "#e0b24f", soft: "#3b2c0c", text: "#fbf1d8" },
];
export const palette = (version) => PALETTES[(version - 1) % PALETTES.length];
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
