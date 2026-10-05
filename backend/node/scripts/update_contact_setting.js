const { sequelize } = require('../models');

async function updateContactEmail() {
  try {
    const [rows] = await sequelize.query("SELECT * FROM settings WHERE `key` = 'CONTACT_PAGE_DATA'");
    if (rows && rows.length > 0) {
      const data = JSON.parse(rows[0].value);
      data.email = 'Baanijewels.ind@gmail.com';
      await sequelize.query(
        "UPDATE settings SET value = :val WHERE `key` = 'CONTACT_PAGE_DATA'",
        { replacements: { val: JSON.stringify(data) } }
      );
      console.log('Successfully updated CONTACT_PAGE_DATA email to:', data.email);
    } else {
      console.log('No CONTACT_PAGE_DATA found in settings');
    }
  } catch (err) {
    console.error('Error updating settings email:', err);
  } finally {
    process.exit(0);
  }
}

updateContactEmail();
