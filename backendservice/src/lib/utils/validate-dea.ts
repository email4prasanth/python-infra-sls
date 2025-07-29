export const validateDEA = (deaNumber: string, lastName: string): boolean => {
  if (!deaNumber || !lastName) return false;

  // Clean input and convert to uppercase
  const _DEA = deaNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const _lastName = lastName.trim().toUpperCase();

  // Check length
  if (_DEA.length !== 9) return false;

  // Check first character (A-H)
  const firstChar = _DEA[0];
  if (firstChar < 'A' || firstChar > 'H') return false;

  // Check second character matches last name initial
  if (_DEA[1] !== _lastName[0]) return false;

  // Extract and validate digits
  const digits = _DEA.substring(2);
  if (!/^\d{7}$/.test(digits)) return false;

  // Convert digits to individual numbers
  const digitArray = digits.split('').map(Number);

  // Perform algorithmic validation
  const sum1 = digitArray[0] + digitArray[2] + digitArray[4];
  const sum2 = (digitArray[1] + digitArray[3] + digitArray[5]) * 2;
  const total = sum1 + sum2;

  // ones digit should match the last digit of the DEA
  const valueAtOncePlace = total % 10;

  return valueAtOncePlace === digitArray[6];
};
