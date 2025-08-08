const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();


exports.sendMedicationReminders = onSchedule('every 1 minutes', async (event) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
  
    const usersSnapshot = await db.collection('users').get();
  
    const promises = [];
  
    usersSnapshot.forEach(userDoc => {
      const userId = userDoc.id;
      const fcmToken = userDoc.get('fcmToken');
      const medicinesRef = db.collection(`users/${userId}/medicine`);
  
      promises.push(medicinesRef.get().then(medicinesSnapshot => {
        medicinesSnapshot.forEach(medicineDoc => {
          const medicine = medicineDoc.data();
          if (medicine.reminderTimes) {
            medicine.reminderTimes.forEach(async time => {
              if (time.hour === currentHour && time.minute === currentMinute) {
                if (fcmToken && fcmToken.trim() !== '') {
                  const payload = {
                    notification: {
                      title: `İlaç Zamanı!`,
                      body: `${medicine.medicationName} ilacını alma zamanı.`,
                    },
                    token: fcmToken
                  };
                  try {
                    await messaging.send(payload);
                    console.log('Bildirim gönderildi:', payload);
                  } catch (error) {
                    console.error('Bildirim hatası:', error);
                  }
                }
              }
            });
          }
        });
      }));
    });
  
    await Promise.all(promises);
    console.log('Bildirim taraması tamamlandı.');
  });
  
