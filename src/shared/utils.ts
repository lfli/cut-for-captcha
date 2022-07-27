export const verifyString = function (val: string) {
  if (val === undefined || val === null || val.trim() === '') {
    return false;
  }
  return true;
}