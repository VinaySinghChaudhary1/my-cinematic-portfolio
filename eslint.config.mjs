import next from "eslint-config-next";

const config = [
  ...next,
  { ignores: [".next/**", "node_modules/**", "data/**", "scripts/*.py"] },
  {
    rules: {
      "@next/next/no-img-element": "off", // user-uploaded images have unknown sizes; we use lazy <img>
      "@next/next/no-location-assign-relative-destination": "off", // intentional full reloads after auth changes
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
    },
  },
  { files: ["src/components/site/sections/HeroPortrait3D.tsx"], rules: { "jsx-a11y/alt-text": "off" } }, // drei <Image> is a WebGL mesh, not <img>
];
export default config;
