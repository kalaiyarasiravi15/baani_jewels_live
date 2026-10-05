// Comprehensive International Countries with real-time dial codes, flags & ISO codes
export const COUNTRIES = [
  { code: '+91',  iso: 'IN', country: 'India', flag: '🇮🇳', currency: 'INR', symbol: '₹' },
  { code: '+1',   iso: 'US', country: 'United States', flag: '🇺🇸', currency: 'USD', symbol: '$' },
  { code: '+44',  iso: 'GB', country: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', symbol: '£' },
  { code: '+971', iso: 'AE', country: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', symbol: 'AED' },
  { code: '+1',   iso: 'CA', country: 'Canada', flag: '🇨🇦', currency: 'CAD', symbol: '$' },
  { code: '+61',  iso: 'AU', country: 'Australia', flag: '🇦🇺', currency: 'AUD', symbol: '$' },
  { code: '+65',  iso: 'SG', country: 'Singapore', flag: '🇸🇬', currency: 'SGD', symbol: '$' },
  { code: '+60',  iso: 'MY', country: 'Malaysia', flag: '🇲🇾', currency: 'MYR', symbol: 'RM' },
  { code: '+966', iso: 'SA', country: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', symbol: 'SAR' },
  { code: '+974', iso: 'QA', country: 'Qatar', flag: '🇶🇦', currency: 'QAR', symbol: 'QAR' },
  { code: '+968', iso: 'OM', country: 'Oman', flag: '🇴🇲', currency: 'OMR', symbol: 'OMR' },
  { code: '+965', iso: 'KW', country: 'Kuwait', flag: '🇰🇼', currency: 'KWD', symbol: 'KWD' },
  { code: '+973', iso: 'BH', country: 'Bahrain', flag: '🇧🇭', currency: 'BHD', symbol: 'BHD' },
  { code: '+49',  iso: 'DE', country: 'Germany', flag: '🇩🇪', currency: 'EUR', symbol: '€' },
  { code: '+33',  iso: 'FR', country: 'France', flag: '🇫🇷', currency: 'EUR', symbol: '€' },
  { code: '+39',  iso: 'IT', country: 'Italy', flag: '🇮🇹', currency: 'EUR', symbol: '€' },
  { code: '+34',  iso: 'ES', country: 'Spain', flag: '🇪🇸', currency: 'EUR', symbol: '€' },
  { code: '+31',  iso: 'NL', country: 'Netherlands', flag: '🇳🇱', currency: 'EUR', symbol: '€' },
  { code: '+41',  iso: 'CH', country: 'Switzerland', flag: '🇨🇭', currency: 'CHF', symbol: 'CHF' },
  { code: '+64',  iso: 'NZ', country: 'New Zealand', flag: '🇳🇿', currency: 'NZD', symbol: '$' },
  { code: '+27',  iso: 'ZA', country: 'South Africa', flag: '🇿🇦', currency: 'ZAR', symbol: 'R' },
  { code: '+94',  iso: 'LK', country: 'Sri Lanka', flag: '🇱🇰', currency: 'LKR', symbol: 'Rs' },
  { code: '+977', iso: 'NP', country: 'Nepal', flag: '🇳🇵', currency: 'NPR', symbol: 'Rs' },
  { code: '+880', iso: 'BD', country: 'Bangladesh', flag: '🇧🇩', currency: 'BDT', symbol: 'Tk' },
  { code: '+960', iso: 'MV', country: 'Maldives', flag: '🇲🇻', currency: 'MVR', symbol: 'Rf' },
  { code: '+81',  iso: 'JP', country: 'Japan', flag: '🇯🇵', currency: 'JPY', symbol: '¥' },
  { code: '+852', iso: 'HK', country: 'Hong Kong', flag: '🇭🇰', currency: 'HKD', symbol: '$' },
  { code: '+353', iso: 'IE', country: 'Ireland', flag: '🇮🇪', currency: 'EUR', symbol: '€' },
  { code: '+46',  iso: 'SE', country: 'Sweden', flag: '🇸🇪', currency: 'SEK', symbol: 'kr' },
  { code: '+47',  iso: 'NO', country: 'Norway', flag: '🇳🇴', currency: 'NOK', symbol: 'kr' },
  { code: '+45',  iso: 'DK', country: 'Denmark', flag: '🇩🇰', currency: 'DKK', symbol: 'kr' },
  { code: '+358', iso: 'FI', country: 'Finland', flag: '🇫🇮', currency: 'EUR', symbol: '€' },
  { code: '+32',  iso: 'BE', country: 'Belgium', flag: '🇧🇪', currency: 'EUR', symbol: '€' },
  { code: '+43',  iso: 'AT', country: 'Austria', flag: '🇦🇹', currency: 'EUR', symbol: '€' },
  { code: '+351', iso: 'PT', country: 'Portugal', flag: '🇵🇹', currency: 'EUR', symbol: '€' },
  { code: '+30',  iso: 'GR', country: 'Greece', flag: '🇬🇷', currency: 'EUR', symbol: '€' },
  { code: '+48',  iso: 'PL', country: 'Poland', flag: '🇵🇱', currency: 'PLN', symbol: 'zł' },
  { code: '+420', iso: 'CZ', country: 'Czech Republic', flag: '🇨🇿', currency: 'CZK', symbol: 'Kč' },
  { code: '+36',  iso: 'HU', country: 'Hungary', flag: '🇭🇺', currency: 'HUF', symbol: 'Ft' },
  { code: '+40',  iso: 'RO', country: 'Romania', flag: '🇷🇴', currency: 'RON', symbol: 'lei' },
  { code: '+90',  iso: 'TR', country: 'Turkey', flag: '🇹🇷', currency: 'TRY', symbol: '₺' },
  { code: '+20',  iso: 'EG', country: 'Egypt', flag: '🇪🇬', currency: 'EGP', symbol: 'E£' },
  { code: '+234', iso: 'NG', country: 'Nigeria', flag: '🇳🇬', currency: 'NGN', symbol: '₦' },
  { code: '+254', iso: 'KE', country: 'Kenya', flag: '🇰🇪', currency: 'KES', symbol: 'KSh' },
  { code: '+62',  iso: 'ID', country: 'Indonesia', flag: '🇮🇩', currency: 'IDR', symbol: 'Rp' },
  { code: '+66',  iso: 'TH', country: 'Thailand', flag: '🇹🇭', currency: 'THB', symbol: '฿' },
  { code: '+84',  iso: 'VN', country: 'Vietnam', flag: '🇻🇳', currency: 'VND', symbol: '₫' },
  { code: '+63',  iso: 'PH', country: 'Philippines', flag: '🇵🇭', currency: 'PHP', symbol: '₱' },
  { code: '+82',  iso: 'KR', country: 'South Korea', flag: '🇰🇷', currency: 'KRW', symbol: '₩' },
  { code: '+55',  iso: 'BR', country: 'Brazil', flag: '🇧🇷', currency: 'BRL', symbol: 'R$' },
  { code: '+52',  iso: 'MX', country: 'Mexico', flag: '🇲🇽', currency: 'MXN', symbol: '$' }
];

export const getCountryByDialCode = (dialCode) => {
  return COUNTRIES.find(c => c.code === dialCode) || COUNTRIES[0];
};

export const getCountryByIso = (iso) => {
  return COUNTRIES.find(c => c.iso.toLowerCase() === iso.toLowerCase()) || COUNTRIES[0];
};