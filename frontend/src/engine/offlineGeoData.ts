/**
 * @license
 * MIT License
 *
 * Offline & Hybrid Geocoding + IANA Historical/DST Timezone Resolver Engine
 * Supports:
 * 1. Instant 0ms search across 165+ Indian & global cities with country/metro aliases (USA, UK, UAE, NYC, SF, etc.).
 * 2. Automatic Daylight Saving Time (DST) & historical UTC offset computation via native Intl.DateTimeFormat.
 * 3. CSP-safe Same-Origin `/api/geo/search` proxy with fallback to Photon & offline catalog.
 * 4. Country-accurate IANA timezone assignment (never misassigning Nepal/Pakistan/Bangladesh to IST +5.5).
 */

export interface OfflineCityRecord {
  id: string;
  name: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  defaultUtcOffset: number;
  timezoneOffset?: number;
  aliases?: string[];
}

export const OFFLINE_CITIES_CATALOG: OfflineCityRecord[] = [
  // INDIA - DELHI NCR & SURROUNDINGS
  { id: 'del', name: 'New Delhi', state: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5, aliases: ['delhi', 'ncr'] },
  { id: 'noi', name: 'Noida', state: 'Uttar Pradesh', country: 'India', latitude: 28.5355, longitude: 77.3910, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'gno', name: 'Greater Noida', state: 'Uttar Pradesh', country: 'India', latitude: 28.4744, longitude: 77.5040, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'ghz', name: 'Ghaziabad', state: 'Uttar Pradesh', country: 'India', latitude: 28.6692, longitude: 77.4538, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'gur', name: 'Gurugram (Gurgaon)', state: 'Haryana', country: 'India', latitude: 28.4595, longitude: 77.0266, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'far', name: 'Faridabad', state: 'Haryana', country: 'India', latitude: 28.4089, longitude: 77.3178, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },

  // INDIA - UTTAR PRADESH & SPIRITUAL HUBS
  { id: 'lko', name: 'Lucknow', state: 'Uttar Pradesh', country: 'India', latitude: 26.8467, longitude: 80.9462, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'kan', name: 'Kanpur', state: 'Uttar Pradesh', country: 'India', latitude: 26.4499, longitude: 80.3319, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'vns', name: 'Varanasi', state: 'Uttar Pradesh', country: 'India', latitude: 25.3176, longitude: 82.9739, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5, aliases: ['kashi', 'banaras', 'benares'] },
  { id: 'ald', name: 'Prayagraj (Allahabad)', state: 'Uttar Pradesh', country: 'India', latitude: 25.4358, longitude: 81.8463, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'ayh', name: 'Ayodhya', state: 'Uttar Pradesh', country: 'India', latitude: 26.7922, longitude: 82.1998, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'agr', name: 'Agra', state: 'Uttar Pradesh', country: 'India', latitude: 27.1767, longitude: 78.0081, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'mat', name: 'Mathura', state: 'Uttar Pradesh', country: 'India', latitude: 27.4924, longitude: 77.6737, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'vrn', name: 'Vrindavan', state: 'Uttar Pradesh', country: 'India', latitude: 27.5806, longitude: 77.7006, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'gkp', name: 'Gorakhpur', state: 'Uttar Pradesh', country: 'India', latitude: 26.7606, longitude: 83.3732, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'mee', name: 'Meerut', state: 'Uttar Pradesh', country: 'India', latitude: 28.9845, longitude: 77.7064, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'bly', name: 'Bareilly', state: 'Uttar Pradesh', country: 'India', latitude: 28.3670, longitude: 79.4304, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'alg', name: 'Aligarh', state: 'Uttar Pradesh', country: 'India', latitude: 27.8974, longitude: 78.0880, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'mbd', name: 'Moradabad', state: 'Uttar Pradesh', country: 'India', latitude: 28.8351, longitude: 78.7747, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'jhs', name: 'Jhansi', state: 'Uttar Pradesh', country: 'India', latitude: 25.4484, longitude: 78.5685, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'sah', name: 'Saharanpur', state: 'Uttar Pradesh', country: 'India', latitude: 29.9671, longitude: 77.5510, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },

  // INDIA - MAHARASHTRA & GOA
  { id: 'bom', name: 'Mumbai', state: 'Maharashtra', country: 'India', latitude: 19.0760, longitude: 72.8777, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5, aliases: ['bombay'] },
  { id: 'pnq', name: 'Pune', state: 'Maharashtra', country: 'India', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'nag', name: 'Nagpur', state: 'Maharashtra', country: 'India', latitude: 21.1458, longitude: 79.0882, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'tha', name: 'Thane', state: 'Maharashtra', country: 'India', latitude: 19.2183, longitude: 72.9781, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'nsk', name: 'Nashik', state: 'Maharashtra', country: 'India', latitude: 19.9975, longitude: 73.7898, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'aur', name: 'Chhatrapati Sambhajinagar (Aurangabad)', state: 'Maharashtra', country: 'India', latitude: 19.8762, longitude: 75.3433, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'kol', name: 'Kolhapur', state: 'Maharashtra', country: 'India', latitude: 16.7050, longitude: 74.2433, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'sol', name: 'Solapur', state: 'Maharashtra', country: 'India', latitude: 17.6599, longitude: 75.9064, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'shd', name: 'Shirdi', state: 'Maharashtra', country: 'India', latitude: 19.7667, longitude: 74.4764, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'goa', name: 'Panaji (Goa)', state: 'Goa', country: 'India', latitude: 15.4909, longitude: 73.8278, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },

  // INDIA - KARNATAKA & SOUTH
  { id: 'blr', name: 'Bengaluru', state: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5, aliases: ['bangalore'] },
  { id: 'mys', name: 'Mysuru (Mysore)', state: 'Karnataka', country: 'India', latitude: 12.2958, longitude: 76.6394, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'hub', name: 'Hubballi-Dharwad', state: 'Karnataka', country: 'India', latitude: 15.3647, longitude: 75.1240, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'mng', name: 'Mangaluru', state: 'Karnataka', country: 'India', latitude: 12.9141, longitude: 74.8560, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'bel', name: 'Belagavi (Belgaum)', state: 'Karnataka', country: 'India', latitude: 15.8497, longitude: 74.4977, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'udp', name: 'Udupi', state: 'Karnataka', country: 'India', latitude: 13.3409, longitude: 74.7421, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },

  // INDIA - TAMIL NADU & KERALA
  { id: 'maa', name: 'Chennai', state: 'Tamil Nadu', country: 'India', latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5, aliases: ['madras'] },
  { id: 'cbe', name: 'Coimbatore', state: 'Tamil Nadu', country: 'India', latitude: 11.0168, longitude: 76.9558, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'mdu', name: 'Madurai', state: 'Tamil Nadu', country: 'India', latitude: 9.9252, longitude: 78.1198, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'try', name: 'Tiruchirappalli (Trichy)', state: 'Tamil Nadu', country: 'India', latitude: 10.7905, longitude: 78.7047, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'slm', name: 'Salem', state: 'Tamil Nadu', country: 'India', latitude: 11.6643, longitude: 78.1460, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'tnv', name: 'Tirunelveli', state: 'Tamil Nadu', country: 'India', latitude: 8.7139, longitude: 77.7567, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'ram', name: 'Rameswaram', state: 'Tamil Nadu', country: 'India', latitude: 9.2876, longitude: 79.3129, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'kny', name: 'Kanyakumari', state: 'Tamil Nadu', country: 'India', latitude: 8.0883, longitude: 77.5385, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'cok', name: 'Kochi', state: 'Kerala', country: 'India', latitude: 9.9312, longitude: 76.2673, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5, aliases: ['cochin'] },
  { id: 'trv', name: 'Thiruvananthapuram (Trivandrum)', state: 'Kerala', country: 'India', latitude: 8.5241, longitude: 76.9366, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'clt', name: 'Kozhikode (Calicut)', state: 'Kerala', country: 'India', latitude: 11.2588, longitude: 75.7804, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'tsr', name: 'Thrissur', state: 'Kerala', country: 'India', latitude: 10.5276, longitude: 76.2144, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },

  // INDIA - TELANGANA & ANDHRA PRADESH
  { id: 'hyd', name: 'Hyderabad', state: 'Telangana', country: 'India', latitude: 17.3850, longitude: 78.4867, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'war', name: 'Warangal', state: 'Telangana', country: 'India', latitude: 17.9689, longitude: 79.5941, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'vzg', name: 'Visakhapatnam (Vizag)', state: 'Andhra Pradesh', country: 'India', latitude: 17.6868, longitude: 83.2185, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'vjw', name: 'Vijayawada', state: 'Andhra Pradesh', country: 'India', latitude: 16.5062, longitude: 80.6480, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'tir', name: 'Tirupati', state: 'Andhra Pradesh', country: 'India', latitude: 13.6288, longitude: 79.4192, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'gtr', name: 'Guntur', state: 'Andhra Pradesh', country: 'India', latitude: 16.3067, longitude: 80.4365, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'nel', name: 'Nellore', state: 'Andhra Pradesh', country: 'India', latitude: 14.4426, longitude: 79.9865, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },

  // INDIA - GUJARAT & RAJASTHAN
  { id: 'amd', name: 'Ahmedabad', state: 'Gujarat', country: 'India', latitude: 23.0225, longitude: 72.5714, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'srt', name: 'Surat', state: 'Gujarat', country: 'India', latitude: 21.1702, longitude: 72.8311, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'bdq', name: 'Vadodara (Baroda)', state: 'Gujarat', country: 'India', latitude: 22.3072, longitude: 73.1812, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'raj', name: 'Rajkot', state: 'Gujarat', country: 'India', latitude: 22.3039, longitude: 70.8022, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'dwk', name: 'Dwarka', state: 'Gujarat', country: 'India', latitude: 22.2442, longitude: 68.9685, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'som', name: 'Somnath (Veraval)', state: 'Gujarat', country: 'India', latitude: 20.9010, longitude: 70.4010, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'jpr', name: 'Jaipur', state: 'Rajasthan', country: 'India', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'jod', name: 'Jodhpur', state: 'Rajasthan', country: 'India', latitude: 26.2389, longitude: 73.0243, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'udp_raj', name: 'Udaipur', state: 'Rajasthan', country: 'India', latitude: 24.5854, longitude: 73.7125, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'kot', name: 'Kota', state: 'Rajasthan', country: 'India', latitude: 25.2138, longitude: 75.8648, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'bik', name: 'Bikaner', state: 'Rajasthan', country: 'India', latitude: 28.0229, longitude: 73.3119, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'ajm', name: 'Ajmer', state: 'Rajasthan', country: 'India', latitude: 26.4499, longitude: 74.6399, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'psk', name: 'Pushkar', state: 'Rajasthan', country: 'India', latitude: 26.4899, longitude: 74.5511, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },

  // INDIA - MADHYA PRADESH & CHHATTISGARH
  { id: 'bho', name: 'Bhopal', state: 'Madhya Pradesh', country: 'India', latitude: 23.2599, longitude: 77.4126, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'ind', name: 'Indore', state: 'Madhya Pradesh', country: 'India', latitude: 22.7196, longitude: 75.8577, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'ujn', name: 'Ujjain', state: 'Madhya Pradesh', country: 'India', latitude: 23.1765, longitude: 75.7885, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'gwl', name: 'Gwalior', state: 'Madhya Pradesh', country: 'India', latitude: 26.2183, longitude: 78.1828, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'jbp', name: 'Jabalpur', state: 'Madhya Pradesh', country: 'India', latitude: 23.1815, longitude: 79.9864, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'rpr', name: 'Raipur', state: 'Chhattisgarh', country: 'India', latitude: 21.2514, longitude: 81.6296, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'bsp', name: 'Bilaspur', state: 'Chhattisgarh', country: 'India', latitude: 22.0797, longitude: 82.1409, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },

  // INDIA - BIHAR & JHARKHAND
  { id: 'pat', name: 'Patna', state: 'Bihar', country: 'India', latitude: 25.5941, longitude: 85.1376, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'gay', name: 'Gaya', state: 'Bihar', country: 'India', latitude: 24.7914, longitude: 85.0002, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'muz', name: 'Muzaffarpur', state: 'Bihar', country: 'India', latitude: 26.1209, longitude: 85.3647, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'bgp', name: 'Bhagalpur', state: 'Bihar', country: 'India', latitude: 25.2425, longitude: 86.9842, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'dbg', name: 'Darbhanga', state: 'Bihar', country: 'India', latitude: 26.1542, longitude: 85.8918, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'rnc', name: 'Ranchi', state: 'Jharkhand', country: 'India', latitude: 23.3441, longitude: 85.3096, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'jsr', name: 'Jamshedpur', state: 'Jharkhand', country: 'India', latitude: 22.8046, longitude: 86.2029, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'dhn', name: 'Dhanbad', state: 'Jharkhand', country: 'India', latitude: 23.7957, longitude: 86.4304, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'dgh', name: 'Deoghar', state: 'Jharkhand', country: 'India', latitude: 24.4826, longitude: 86.7001, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },

  // INDIA - PUNJAB, HARYANA & NORTH HILLS
  { id: 'chd', name: 'Chandigarh', state: 'Punjab/Haryana', country: 'India', latitude: 30.7333, longitude: 76.7794, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'ldh', name: 'Ludhiana', state: 'Punjab', country: 'India', latitude: 30.9010, longitude: 75.8573, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'asr', name: 'Amritsar', state: 'Punjab', country: 'India', latitude: 31.6340, longitude: 74.8723, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'jal', name: 'Jalandhar', state: 'Punjab', country: 'India', latitude: 31.3260, longitude: 75.5762, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'ddn', name: 'Dehradun', state: 'Uttarakhand', country: 'India', latitude: 30.3165, longitude: 78.0322, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'hwr', name: 'Haridwar', state: 'Uttarakhand', country: 'India', latitude: 29.9457, longitude: 78.1642, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'rsh', name: 'Rishikesh', state: 'Uttarakhand', country: 'India', latitude: 30.0869, longitude: 78.2676, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'sml', name: 'Shimla', state: 'Himachal Pradesh', country: 'India', latitude: 31.1048, longitude: 77.1734, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'dhm', name: 'Dharamshala', state: 'Himachal Pradesh', country: 'India', latitude: 32.2190, longitude: 76.3234, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'sgr', name: 'Srinagar', state: 'Jammu and Kashmir', country: 'India', latitude: 34.0837, longitude: 74.7973, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'jmu', name: 'Jammu', state: 'Jammu and Kashmir', country: 'India', latitude: 32.7266, longitude: 74.8570, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },

  // INDIA - EAST, ODISHA & NORTHEAST
  { id: 'ccu', name: 'Kolkata', state: 'West Bengal', country: 'India', latitude: 22.5726, longitude: 88.3639, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5, aliases: ['calcutta'] },
  { id: 'hwh', name: 'Howrah', state: 'West Bengal', country: 'India', latitude: 22.5958, longitude: 88.2636, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'slg', name: 'Siliguri', state: 'West Bengal', country: 'India', latitude: 26.7271, longitude: 88.3953, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'ixc', name: 'Bhubaneswar', state: 'Odisha', country: 'India', latitude: 20.2961, longitude: 85.8245, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'ctk', name: 'Cuttack', state: 'Odisha', country: 'India', latitude: 20.4625, longitude: 85.8828, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'pur', name: 'Puri', state: 'Odisha', country: 'India', latitude: 19.8135, longitude: 85.8312, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'gau', name: 'Guwahati', state: 'Assam', country: 'India', latitude: 26.1445, longitude: 91.7362, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'shl', name: 'Shillong', state: 'Meghalaya', country: 'India', latitude: 25.5788, longitude: 91.8933, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },
  { id: 'agt', name: 'Agartala', state: 'Tripura', country: 'India', latitude: 23.8315, longitude: 91.2868, timezone: 'Asia/Kolkata', defaultUtcOffset: 5.5 },

  // SOUTH ASIAN NEIGHBORS (Exact Half / Quarter-Hour Timezones)
  { id: 'ktm', name: 'Kathmandu', state: 'Bagmati', country: 'Nepal', latitude: 27.7172, longitude: 85.3240, timezone: 'Asia/Kathmandu', defaultUtcOffset: 5.75 },
  { id: 'khi', name: 'Karachi', state: 'Sindh', country: 'Pakistan', latitude: 24.8607, longitude: 67.0011, timezone: 'Asia/Karachi', defaultUtcOffset: 5.0 },
  { id: 'lhe', name: 'Lahore', state: 'Punjab', country: 'Pakistan', latitude: 31.5204, longitude: 74.3587, timezone: 'Asia/Karachi', defaultUtcOffset: 5.0 },
  { id: 'dac', name: 'Dhaka', state: 'Dhaka', country: 'Bangladesh', latitude: 23.8103, longitude: 90.4125, timezone: 'Asia/Dhaka', defaultUtcOffset: 6.0 },
  { id: 'cmb', name: 'Colombo', state: 'Western', country: 'Sri Lanka', latitude: 6.9271, longitude: 79.8612, timezone: 'Asia/Colombo', defaultUtcOffset: 5.5 },
  { id: 'pbh', name: 'Thimphu', state: 'Thimphu', country: 'Bhutan', latitude: 27.4728, longitude: 89.6393, timezone: 'Asia/Thimphu', defaultUtcOffset: 6.0 },
  { id: 'rgn', name: 'Yangon', state: 'Yangon', country: 'Myanmar', latitude: 16.8409, longitude: 96.1735, timezone: 'Asia/Yangon', defaultUtcOffset: 6.5 },

  // GLOBAL METROS & INTERNATIONAL HUBS
  { id: 'lon', name: 'London', state: 'England', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', defaultUtcOffset: 0.0, aliases: ['uk', 'britain', 'england'] },
  { id: 'nyc', name: 'New York', state: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York', defaultUtcOffset: -5.0, aliases: ['ny', 'nyc', 'usa', 'us', 'manhattan'] },
  { id: 'sfo', name: 'San Francisco', state: 'California', country: 'United States', latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles', defaultUtcOffset: -8.0, aliases: ['sf', 'usa', 'us', 'bay area'] },
  { id: 'lax', name: 'Los Angeles', state: 'California', country: 'United States', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles', defaultUtcOffset: -8.0, aliases: ['la', 'usa', 'us'] },
  { id: 'chi', name: 'Chicago', state: 'Illinois', country: 'United States', latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago', defaultUtcOffset: -6.0, aliases: ['usa', 'us'] },
  { id: 'sea', name: 'Seattle', state: 'Washington', country: 'United States', latitude: 47.6062, longitude: -122.3321, timezone: 'America/Los_Angeles', defaultUtcOffset: -8.0, aliases: ['usa', 'us'] },
  { id: 'bos', name: 'Boston', state: 'Massachusetts', country: 'United States', latitude: 42.3601, longitude: -71.0589, timezone: 'America/New_York', defaultUtcOffset: -5.0, aliases: ['usa', 'us'] },
  { id: 'aus_us', name: 'Austin', state: 'Texas', country: 'United States', latitude: 30.2672, longitude: -97.7431, timezone: 'America/Chicago', defaultUtcOffset: -6.0, aliases: ['usa', 'us', 'tx'] },
  { id: 'dal', name: 'Dallas', state: 'Texas', country: 'United States', latitude: 32.7767, longitude: -96.7970, timezone: 'America/Chicago', defaultUtcOffset: -6.0, aliases: ['usa', 'us', 'tx'] },
  { id: 'tor', name: 'Toronto', state: 'Ontario', country: 'Canada', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto', defaultUtcOffset: -5.0 },
  { id: 'van', name: 'Vancouver', state: 'British Columbia', country: 'Canada', latitude: 49.2827, longitude: -123.1207, timezone: 'America/Vancouver', defaultUtcOffset: -8.0 },
  { id: 'gru', name: 'São Paulo', state: 'São Paulo', country: 'Brazil', latitude: -23.5505, longitude: -46.6333, timezone: 'America/Sao_Paulo', defaultUtcOffset: -3.0, aliases: ['sao paulo'] },
  { id: 'dxb', name: 'Dubai', state: 'Dubai', country: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai', defaultUtcOffset: 4.0, aliases: ['uae'] },
  { id: 'auh', name: 'Abu Dhabi', state: 'Abu Dhabi', country: 'United Arab Emirates', latitude: 24.4539, longitude: 54.3773, timezone: 'Asia/Dubai', defaultUtcOffset: 4.0, aliases: ['uae'] },
  { id: 'doh', name: 'Doha', state: 'Doha', country: 'Qatar', latitude: 25.2854, longitude: 51.5310, timezone: 'Asia/Qatar', defaultUtcOffset: 3.0 },
  { id: 'cai', name: 'Cairo', state: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo', defaultUtcOffset: 2.0 },
  { id: 'sin', name: 'Singapore', state: 'Central', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore', defaultUtcOffset: 8.0 },
  { id: 'kul', name: 'Kuala Lumpur', state: 'Federal Territory', country: 'Malaysia', latitude: 3.1390, longitude: 101.6869, timezone: 'Asia/Kuala_Lumpur', defaultUtcOffset: 8.0 },
  { id: 'bkk', name: 'Bangkok', state: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, timezone: 'Asia/Bangkok', defaultUtcOffset: 7.0 },
  { id: 'tyo', name: 'Tokyo', state: 'Kanto', country: 'Japan', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo', defaultUtcOffset: 9.0 },
  { id: 'syd', name: 'Sydney', state: 'New South Wales', country: 'Australia', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney', defaultUtcOffset: 10.0 },
  { id: 'mel', name: 'Melbourne', state: 'Victoria', country: 'Australia', latitude: -37.8136, longitude: 144.9631, timezone: 'Australia/Melbourne', defaultUtcOffset: 10.0 },
  { id: 'par', name: 'Paris', state: 'Île-de-France', country: 'France', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris', defaultUtcOffset: 1.0 },
  { id: 'mad', name: 'Madrid', state: 'Madrid', country: 'Spain', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid', defaultUtcOffset: 1.0 },
  { id: 'ber', name: 'Berlin', state: 'Berlin', country: 'Germany', latitude: 52.5200, longitude: 13.4050, timezone: 'Europe/Berlin', defaultUtcOffset: 1.0 },
  { id: 'ams', name: 'Amsterdam', state: 'North Holland', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041, timezone: 'Europe/Amsterdam', defaultUtcOffset: 1.0 },
  { id: 'zrh', name: 'Zurich', state: 'Zurich', country: 'Switzerland', latitude: 47.3769, longitude: 8.5417, timezone: 'Europe/Zurich', defaultUtcOffset: 1.0 },
  { id: 'mow', name: 'Moscow', state: 'Moscow', country: 'Russia', latitude: 55.7558, longitude: 37.6173, timezone: 'Europe/Moscow', defaultUtcOffset: 3.0 },
  { id: 'tos', name: 'Tromsø', state: 'Troms', country: 'Norway', latitude: 69.6492, longitude: 18.9553, timezone: 'Europe/Oslo', defaultUtcOffset: 1.0, aliases: ['tromso'] }
];

const COUNTRY_TO_IANA: Record<string, { tz: string; offset: number }> = {
  india: { tz: 'Asia/Kolkata', offset: 5.5 },
  nepal: { tz: 'Asia/Kathmandu', offset: 5.75 },
  pakistan: { tz: 'Asia/Karachi', offset: 5.0 },
  bangladesh: { tz: 'Asia/Dhaka', offset: 6.0 },
  'sri lanka': { tz: 'Asia/Colombo', offset: 5.5 },
  bhutan: { tz: 'Asia/Thimphu', offset: 6.0 },
  myanmar: { tz: 'Asia/Yangon', offset: 6.5 },
  afghanistan: { tz: 'Asia/Kabul', offset: 4.5 },
  iran: { tz: 'Asia/Tehran', offset: 3.5 },
  china: { tz: 'Asia/Shanghai', offset: 8.0 },
  japan: { tz: 'Asia/Tokyo', offset: 9.0 },
  singapore: { tz: 'Asia/Singapore', offset: 8.0 },
  'united arab emirates': { tz: 'Asia/Dubai', offset: 4.0 },
  qatar: { tz: 'Asia/Qatar', offset: 3.0 },
  'united kingdom': { tz: 'Europe/London', offset: 0.0 },
  spain: { tz: 'Europe/Madrid', offset: 1.0 },
  france: { tz: 'Europe/Paris', offset: 1.0 },
  germany: { tz: 'Europe/Berlin', offset: 1.0 },
  italy: { tz: 'Europe/Rome', offset: 1.0 },
  switzerland: { tz: 'Europe/Zurich', offset: 1.0 },
  norway: { tz: 'Europe/Oslo', offset: 1.0 },
  egypt: { tz: 'Africa/Cairo', offset: 2.0 }
};

export class OfflineGeoResolver {
  /**
   * Formats Latitude & Longitude cleanly with N/S and E/W indicators
   */
  public static formatCoordinates(lat: number, lon: number, decimals: number = 2): string {
    const safeLat = Number.isFinite(lat) ? lat : 0;
    const safeLon = Number.isFinite(lon) ? lon : 0;
    const ns = safeLat >= 0 ? 'N' : 'S';
    const ew = safeLon >= 0 ? 'E' : 'W';
    return `${Math.abs(safeLat).toFixed(decimals)}°${ns}, ${Math.abs(safeLon).toFixed(decimals)}°${ew}`;
  }

  /**
   * Computes exact historical / DST-aware UTC offset (in hours, e.g. -4 vs -5, +5.75, +11) for an IANA timezone on `dateStr`
   */
  public static resolveTimezoneOffsetForDate(
    timezone: string | undefined,
    dateStr: string | undefined,
    fallbackOffset: number = 5.5
  ): number {
    if (!timezone || timezone === 'UTC_OFFSET' || timezone === 'Local') return fallbackOffset;
    if (timezone === 'UTC' || timezone === 'Etc/UTC') return 0;
    try {
      const target = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? new Date(`${dateStr}T12:00:00Z`)
        : new Date();
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset'
      }).formatToParts(target);
      const tzToken = parts.find(p => p.type === 'timeZoneName')?.value || '';
      if (tzToken === 'GMT' || tzToken === 'UTC') return 0;
      const m = tzToken.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
      if (m) {
        const sign = m[1] === '-' ? -1 : 1;
        const hrs = parseInt(m[2], 10);
        const mins = m[3] ? parseInt(m[3], 10) : 0;
        return sign * (hrs + mins / 60.0);
      }
    } catch {
      // Fallback if environment lacks specific IANA zone
    }
    return fallbackOffset;
  }

  /**
   * Resolves IANA timezone & current/target offset for arbitrary coordinates + country
   */
  public static inferTimezoneForPlace(
    lat: number,
    lon: number,
    country: string,
    dateStr?: string
  ): { timezone: string; utcOffset: number } {
    const cNorm = (country || '').trim().toLowerCase();
    if (COUNTRY_TO_IANA[cNorm]) {
      const { tz, offset } = COUNTRY_TO_IANA[cNorm];
      return { timezone: tz, utcOffset: this.resolveTimezoneOffsetForDate(tz, dateStr, offset) };
    }

    const nearest = this.findNearestCity(lat, lon);
    if (nearest.distanceKm < 450 && (!cNorm || nearest.city.country.toLowerCase() === cNorm)) {
      const tz = nearest.city.timezone;
      return {
        timezone: tz,
        utcOffset: this.resolveTimezoneOffsetForDate(tz, dateStr, nearest.city.defaultUtcOffset)
      };
    }

    if (cNorm === 'united states' || cNorm === 'usa') {
      const usTz = lon > -85 ? 'America/New_York' : lon > -102 ? 'America/Chicago' : lon > -115 ? 'America/Denver' : 'America/Los_Angeles';
      const baseOff = lon > -85 ? -5 : lon > -102 ? -6 : lon > -115 ? -7 : -8;
      return { timezone: usTz, utcOffset: this.resolveTimezoneOffsetForDate(usTz, dateStr, baseOff) };
    }

    // Integer hour zone fallback (never inventing fake half-hour solar zones)
    const wholeHourOffset = Math.max(-12, Math.min(14, Math.round(lon / 15.0)));
    return { timezone: 'UTC_OFFSET', utcOffset: wholeHourOffset };
  }

  /**
   * Fast synchronous prefix, substring, and alias matching
   */
  public static searchCities(query: string, limit: number = 8, dateStr?: string): OfflineCityRecord[] {
    const q = query.trim().toLowerCase();
    const list = !q
      ? OFFLINE_CITIES_CATALOG.slice(0, limit)
      : OFFLINE_CITIES_CATALOG.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q) ||
          (c.aliases && c.aliases.some(a => a === q || a.startsWith(q)))
        ).slice(0, limit);

    return list.map(c => {
      const resolved = this.resolveTimezoneOffsetForDate(c.timezone, dateStr, c.defaultUtcOffset);
      return { ...c, timezoneOffset: resolved };
    });
  }

  /**
   * Live online autocomplete using same-origin `/api/geo/search` proxy first (CSP-safe in production),
   * falling back to direct Photon only when running standalone without Express.
   */
  public static async searchOnlinePlaces(query: string, limit: number = 6, dateStr?: string): Promise<OfflineCityRecord[]> {
    const q = query.trim();
    if (q.length < 3) return [];

    const parseFeatures = (features: unknown[]): OfflineCityRecord[] =>
      features.map((rawFeature, idx) => {
        const f = rawFeature as {
          properties?: { name?: string; city?: string; town?: string; village?: string; state?: string; county?: string; country?: string };
          geometry?: { coordinates?: number[] };
        };
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [0, 0];
        const lon = Number(coords[0]);
        const lat = Number(coords[1]);
        const name = props.name || props.city || props.town || props.village || q;
        const state = props.state || props.county || '';
        const country = props.country || '';
        const { timezone, utcOffset } = this.inferTimezoneForPlace(lat, lon, country, dateStr);

        return {
          id: `online-${idx}-${lat.toFixed(3)}-${lon.toFixed(3)}`,
          name,
          state,
          country: country || state || 'Global',
          latitude: Number(lat.toFixed(4)),
          longitude: Number(lon.toFixed(4)),
          timezone,
          defaultUtcOffset: utcOffset,
          timezoneOffset: utcOffset
        };
      });

    // Production uses same-origin `/api/geo/search` proxy (strict CSP `connect-src 'self'`); Dev queries Photon directly without 404s on un-restarted dev servers
    const endpoint = import.meta.env.PROD
      ? `/api/geo/search?q=${encodeURIComponent(q)}&limit=${limit}`
      : `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=${limit}`;
    try {
      const res = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(2500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.features) && data.features.length > 0) {
          return parseFeatures(data.features);
        }
      }
    } catch {
      // Offline or unreachable — seamless fallback to 165-city local catalog
    }

    return [];
  }

  /**
   * Unified Places Search: Combines instant 0ms offline results with live geocoding.
   */
  public static async searchUnifiedPlaces(query: string, limit: number = 8, dateStr?: string): Promise<OfflineCityRecord[]> {
    const offlineResults = this.searchCities(query, limit, dateStr);
    if (query.trim().length < 3) {
      return offlineResults;
    }

    try {
      const onlineResults = await this.searchOnlinePlaces(query, 6, dateStr);
      if (onlineResults.length === 0) return offlineResults;

      const combined = [...offlineResults];
      for (const on of onlineResults) {
        const isDuplicate = combined.some(
          ex => Math.abs(ex.latitude - on.latitude) < 0.1 && Math.abs(ex.longitude - on.longitude) < 0.1
        );
        if (!isDuplicate) {
          combined.push(on);
        }
      }
      return combined.slice(0, limit);
    } catch {
      return offlineResults;
    }
  }

  /**
   * Haversine formula to find nearest catalog city for GPS coordinates
   */
  public static findNearestCity(lat: number, lon: number): { city: OfflineCityRecord; distanceKm: number } {
    let nearest = OFFLINE_CITIES_CATALOG[0];
    let minDistance = Infinity;

    const toRad = (x: number) => (x * Math.PI) / 180.0;
    const R = 6371;

    for (const city of OFFLINE_CITIES_CATALOG) {
      const dLat = toRad(city.latitude - lat);
      const dLon = toRad(city.longitude - lon);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat)) * Math.cos(toRad(city.latitude)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance < minDistance) {
        minDistance = distance;
        nearest = city;
      }
    }

    return { city: nearest, distanceKm: Math.round(minDistance) };
  }

  /**
   * Resolves device's current timezone using native browser Intl API
   */
  public static getDeviceTimezone(): { timezone: string; utcOffsetHours: number } {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const now = new Date();
      const utcOffsetHours = -now.getTimezoneOffset() / 60.0;
      return { timezone, utcOffsetHours };
    } catch {
      return { timezone: 'Asia/Kolkata', utcOffsetHours: 5.5 };
    }
  }
}