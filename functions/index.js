const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Рассылает уведомления в случае появления нового сообщения.
 *
 * @type {CloudFunction<DataSnapshot>}
 */
exports.sendNotifications = functions.database.ref('/messages/{messageId}').onCreate((snapshot) => {
    // Настроим текст уведолмения
    const text = snapshot.val().text;
    const payload = {
        notification: {
            title: `${snapshot.val().name} написал сообщение`,
            body: text.length <= 100 ? text : text.substring(0, 97) + '...',
            icon: '/images/profile_placeholder.png',
            click_action: `https://castle-if.ru`
        }
    };

    let tokens = [];
    // Зашлем пуши всем подписавшимся бедолагам
    return admin.database().ref('fcmTokens').once('value').then((allTokens) => {
        if (allTokens.exists()) {
            // Высосем все токены
            tokens = Object.keys(allTokens.val());

            // ПАЛУЧИТЕ, СУЧАРЫ, УВЕДОМЛЕНИЯ!
            return admin.messaging().sendToDevice(tokens, payload);
        }
        return { results: [] }
    }).then((response) => {
        return cleanupTokens(response, tokens);
    }).then(() => {
        console.log('Уведомление отправлено и токен очищен.');
        return null;
    });
});

/**
 * Функция удаляет токены которые протухли.
 *
 * @param response
 * @param tokens
 * @returns {Promise<void>}
 */
function cleanupTokens(response, tokens) {
    // прогоним все токены на предмет ошибок отправки,
    // может какая гнида тухлая закралась
    const tokensToRemove = {};
    response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
            console.error('Сбой отправки сообщения ', tokens[index], error);
            // Удалим тухляк
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                tokensToRemove[`/fcmTokens/${tokens[index]}`] = null;
            }
        }
    });

    return admin.database().ref().update(tokensToRemove);
}