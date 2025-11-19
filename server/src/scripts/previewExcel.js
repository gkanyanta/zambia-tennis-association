import XLSX from 'xlsx';

const filePath = '/mnt/c/Users/HP/Downloads/ZTA_Junior_Clean_Final.xlsx';

try {
  // Read the Excel file
  const workbook = XLSX.readFile(filePath);

  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log('Total rows:', data.length);
  console.log('\nColumn headers:', Object.keys(data[0] || {}));
  console.log('\nFirst 3 rows:');
  console.log(JSON.stringify(data.slice(0, 3), null, 2));

} catch (error) {
  console.error('Error reading Excel file:', error.message);
}
