export const sendSMS = async (phone, message) => {
  try {
    if (!phone) return { success: false, message: 'No phone number provided' };
    
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '94' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('94') && !formattedPhone.startsWith('+')) {
      formattedPhone = '94' + formattedPhone;
    }
    formattedPhone = formattedPhone.replace(/\+/g, ''); // formatting properly for SMSLenz

    const response = await fetch('https://smslenz.lk/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: '1553',
        api_key: 'e35daf6c-d086-4a9d-a6b9-9b5f43b9ed38',
        sender_id: 'SMSlenzDEMO', // Assuming this is your sender ID
        contact: `+${formattedPhone}`,
        message: message
      })
    });

    const result = await response.json();
    console.log('SMS Send Result:', result);
    return result;
  } catch (error) {
    console.error('SMS Gateway Error:', error);
    return { success: false, message: error.message };
  }
};
