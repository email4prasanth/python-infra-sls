import { validateDEA } from './';

describe('validateDEA', () => {
  it('returns false if deaNumber or lastName is missing', () => {
    expect(validateDEA('', 'Smith')).toBe(false);
    expect(validateDEA('AB1234567', '')).toBe(false);
    expect(validateDEA('', '')).toBe(false);
  });

  it('returns false if DEA number is not 9 characters after cleaning', () => {
    expect(validateDEA('AB123456', 'Brown')).toBe(false);
    expect(validateDEA('AB12345678', 'Brown')).toBe(false);
  });

  it('returns false if first character is not A-H', () => {
    expect(validateDEA('ZB1234567', 'Brown')).toBe(false);
    expect(validateDEA('IB1234567', 'Brown')).toBe(false);
  });

  it('returns false if second character does not match last name initial', () => {
    expect(validateDEA('AB1234567', 'Smith')).toBe(false);
    expect(validateDEA('AC1234567', 'Brown')).toBe(false);
  });

  it('returns false if last 7 are not all digits', () => {
    expect(validateDEA('AB12345A7', 'Brown')).toBe(false);
    expect(validateDEA('AB12B4567', 'Brown')).toBe(false);
  });

  it('returns false if DEA checksum is invalid', () => {
    // For DEA: AB1234567, using Brown, checksum will not match
    expect(validateDEA('AB1234567', 'Brown')).toBe(false);
  });

  it('returns true for a valid DEA number', () => {
    // Let's construct a valid DEA: A for A-H, B for Brown, then 7 digits
    // Let's use digits: 1 2 3 4 5 6 X, where X is the checksum digit

    // sum1 = 1+3+5 = 9
    // sum2 = (2+4+6) * 2 = (12) * 2 = 24
    // total = 9+24 = 33
    // ones digit = 3

    // So last digit should be 3
    expect(validateDEA('AB1234563', 'Brown')).toBe(true);
    // Also test with lowercase and spaces
    expect(validateDEA('ab1234563', ' brown ')).toBe(true);
    // Test with extra dashes or spaces in DEA
    expect(validateDEA('A-B1234-563', 'Brown')).toBe(true);
  });

  it('handles edge cases with whitespace and casing', () => {
    expect(validateDEA(' ab1234563 ', ' brown ')).toBe(true);
    expect(validateDEA('AB1234563', 'BROWN')).toBe(true);
    expect(validateDEA('AB1234563', 'brown')).toBe(true);
  });
});
