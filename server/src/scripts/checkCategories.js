import XLSX from 'xlsx';

const filePath = '/mnt/c/Users/HP/Downloads/ZTA_Junior_Clean_Final.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  // Categorize by age and category
  const juniors = data.filter(row => row.age < 18);
  const seniors = data.filter(row => row.age >= 18);

  // Check categories
  const categories = [...new Set(data.map(row => row.category))];

  console.log('Total players:', data.length);
  console.log('\nBy Age:');
  console.log('- Juniors (age < 18):', juniors.length);
  console.log('- Seniors (age >= 18):', seniors.length);

  console.log('\nAll categories found:');
  categories.forEach(cat => {
    const count = data.filter(row => row.category === cat).length;
    console.log(`- ${cat}: ${count}`);
  });

  console.log('\nSample senior players:');
  seniors.slice(0, 5).forEach(row => {
    const firstName = row['firs+A1:V69t_name'] || row['first_name'];
    console.log(`- ${firstName} ${row.last_name}, Age: ${row.age}, Category: ${row.category}`);
  });

} catch (error) {
  console.error('Error:', error.message);
}
