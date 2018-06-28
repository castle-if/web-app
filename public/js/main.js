'use strict';

function CastleIf() {
    this.checkSetup();

    this.messageList = document.getElementById('messages');
    this.messageInput = document.getElementById('prompt');
    this.userName = document.getElementById('user-name');

    let actionInput = this.actionInput.bind(this);
    this.messageInput.addEventListener('keyup', actionInput);

    this.initFirebase();
}

/**
 * Инициализация чата со всеми патрахами.
 */
CastleIf.prototype.initFirebase = function () {
    // Создадим ярлычки на сервисы Firebase
    this.auth = firebase.auth();
    this.database = firebase.database();
    this.messaging = firebase.messaging();
    // Попоробуем получить статус авторизации из Firebase
    this.auth.onAuthStateChanged(this.authStateObserver.bind(this));
};

/**
 * Авторизация в чате через сервис авторизаций Firebase.
 * И хуй мы ложили на написание своих методов авторизации, опа - готова!
 */
CastleIf.prototype.signIn = function () {
    let profider = new firebase.auth.GoogleAuthProvider();
    this.auth.signInWithPopup(profider);
};

/**
 * Выход из олдскульного чатика, только олдфаги будут выходить, хотя...
 */
CastleIf.prototype.signOut = function () {
    this.auth.signOut();
};

/**
 * Функция возвращает имя пользователя, которое будет использоваться в чатике, сучки.
 *
 * @returns {string}
 */
CastleIf.prototype.getUserName = function () {
    return this.auth.currentUser.displayName;
};

/**
 * Функция проверяет авторизацию пользователя и возвращает true или false.
 *
 * @returns {boolean}
 */
CastleIf.prototype.isUserSignedIn = function () {
    return !!this.auth.currentUser;
};

/**
 * Функция загружает древние сообщения, ну, те которые еще до вошедшего были
 */
CastleIf.prototype.loadMessages = function () {
    let setMessage = function (snap) {
        let data = snap.val();
        this.displayMessage(snap.key, data.createdAt, data.name, data.text);
    }.bind(this);

    this.database.ref('/messages/').limitToLast(5).on('child_added', setMessage);
    this.database.ref('/messages/').limitToLast(5).on('child_changed', setMessage);
};

/**
 * Функция записывает сообщение пользователя в БД Firebase со всеми делами, сучки!
 *
 * @param messageText
 * @returns {Promise<T>}
 */
CastleIf.prototype.saveMessage = function(messageText) {
    return this.database.ref('/messages/').push({
        name: this.getUserName(),
        text: messageText,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).catch(function (error) {
        console.error('Не получилось записать в БД Firebase это говно.', error);
    });
};

/**
 * Сохраним токен устройства для рассылки уведомлений, чтобы нихуя не пропустить!
 */
CastleIf.prototype.saveMessagingDeviceToken = function () {
    this.messaging.getToken().then(function (currentToken) {
        if (currentToken) {
            console.log('FCM token:', currentToken);
            this.database.ref('/fcmTokens').child(currentToken).set(this.auth.currentUser.id);
        } else {
            this.requestNotificationsPermissions();
        }
    }.bind(this)).catch(function (error) {
        console.log('Получить токен устройства не получилось, а хули!', error);
    });
};

/**
 * Функция запрашивает разрешение на отправку уведомлений пользователю.
 */
CastleIf.prototype.requestNotificationsPermissions = function () {
    console.log('Запрашиваем разрешение на уведомления...');
    this.messaging.requestPermission().then(function () {
        this.saveMessagingDeviceToken();
    }.bind(this)).catch(function (error) {
        console.error('Получить разрешение не вышло, потому что пользователь — дон Гандон!', error);
    });
};

/**
 * Установим данные текущего пользователя, чтобы было красиво!
 *
 * @param user
 */
CastleIf.prototype.authStateObserver = function (user)  {
    if (user) {
        // пропишем никнейм пользователя в нужное поле
        this.userName.textContent = this.getUserName();

        // попробуем сохранить токен устройства пользователя для отправки уведомлений из чата
        this.saveMessagingDeviceToken();
    } else {
        // все анонимные уроды будут гостями без права быть нормальным человеком
        this.userName.textContent = 'guest';
    }

    // подгрузим старые сообщения
    this.loadMessages();
};

/**
 * Функция проверяет авторизацию пользователя перед отправкой сообщения.
 *
 * @returns {boolean}
 */
CastleIf.prototype.checkSignedInWithMessage = function () {
    if (this.isUserSignedIn()) {
        return true;
    }

    const self = this;

    // сообщим пользователю о том, что он урод, вернее, должен авторизоваться.
    Snackbar.show({
        pos: 'bottom-center',
        text: 'Сначала авторизуйся или сиди и читай, сучка!',
        actionText: 'Войти',
        actionTextColor: '#859901',
        onActionClick: function (element) {
            element.style.opacity = '0';
            self.putCommand('login google');
        }
    });

    return false;
};

CastleIf.prototype.putCommand = function (command) {
    this.messageInput.value = '/' + command;
    this.messageInput.focus();
};

/**
 * Функция очищет поле ввода сообщения
 */
CastleIf.prototype.resetInput = function () {
    this.messageInput.value = '';
};

/**
 * Шаблончик сообщения, лучше и не придумаешь, ЗАЕБИСЬ!
 *
 * @type {string}
 */
CastleIf.MESSAGE_TEMPLATE =
    '<p class="message">' +
        '<small class="timestamp"></small> | ' +
        '<a href="#" class="nikname"></a><span class="divider">:</span> ' +
        '<span class="text"></span>' +
    '</p>';

/**
 * Справка по чату.
 *
 * @type {string}
 */
CastleIf.HELP_MESSAGE =
    '<p class="message">В чате работают разные команды, вот текущий список комманд:' +
        '<ul class="star-list">' +
            '<li><kbd>/login google</kbd> - вход в чат через Google</li>' +
            '<li><kbd>/logout</kbd> - выход из чата</li>' +
            '<li><kbd>/help</kbd> - вывод данной справки</li>' +
        '</ul>' +
    '</p>';

/**
 * Функция отображает сообщение в чатике....
 *
 * @param key Уникальный идентификатор записи в БД
 * @param timestamp Время отправления сообщения
 * @param name Никнейм пользователья олдфага
 * @param text Текст сообщения, очень важного и романтичного, из далеких 2000-х
 */
CastleIf.prototype.displayMessage = function(key, timestamp, name, text) {
    let div = document.getElementById(key);
    if (!div) {
        let container = document.createElement('div');
        container.innerHTML = CastleIf.MESSAGE_TEMPLATE;
        div = container.firstChild;
        div.setAttribute('id', key);
        this.messageList.appendChild(div);
    }

    const date = new Date(timestamp);

    div.querySelector('.timestamp').textContent = date.toLocaleDateString('ru') + ' ' + date.toLocaleTimeString('ru');
    div.querySelector('.nikname').textContent = name;
    let messageElement = div.querySelector('.text');
    if (text) {
        messageElement.textContent = text;
        messageElement.innerHTML = messageElement.innerHTML.replace(/[<>/]/g, '');
    }

    this.scrollChat();
};

/**
 * Функция скролит чат в самый низ. В НИЗ, СУКА!
 */
CastleIf.prototype.scrollChat = function () {
    window.scrollTo(0, document.body.scrollHeight);
    this.messageInput.focus();
};

CastleIf.prototype.hashCode = function () {
    let hash = 0;
    // for (let i = 0; i < )
};

/**
 * Функция выполняет действия пользователя, например отправка сообщения.
 *
 * @param event
 */
CastleIf.prototype.actionInput = function (event) {
    const message = this.messageInput.value;

    if (message && event.keyCode === 13) {
        if (message.indexOf('/login') === 0) {
            this.signIn();
            this.resetInput();
        } else if (message.indexOf('/logout') === 0) {
            this.signOut();
            this.resetInput();
        } else if (message.indexOf('/help') === 0 || message.indexOf('/?') === 0) {
            let div = document.createElement('div');
            div.innerHTML = CastleIf.HELP_MESSAGE;
            this.messageList.appendChild(div);
            this.scrollChat();
            this.resetInput();
        } else {
            if (this.checkSignedInWithMessage()) {
                this.saveMessage(this.messageInput.value).then(function () {
                    this.resetInput();
                }.bind(this));
            }
        }
    }
};

/**
 * Проферим настроечки нашего чатика, может где пизда какая вкралась.
 */
CastleIf.prototype.checkSetup = function () {
    if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options || !window.Snackbar) {
        window.alert(
            'У вас все пошло по пизде! ' +
            'Обратитесь к системному администратору.'
        );
    }
};

/**
 * Запустим чатик... ПОЕХАЛИ!
 */
window.addEventListener('load', function () {
    window.castleIf = new CastleIf();
});