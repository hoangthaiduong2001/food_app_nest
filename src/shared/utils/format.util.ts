export const capitalizeFirstLetter = (str: string | number) => {
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
};
