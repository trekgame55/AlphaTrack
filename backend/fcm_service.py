"""
FCM Push Notification Service
------------------------------
Отправляет push-уведомления на мобильные устройства через Firebase Admin SDK.

Для работы необходимо:
1. Создать проект в Firebase Console
2. Скачать serviceAccountKey.json (Project Settings → Service accounts → Generate new private key)
3. Положить его рядом: backend/serviceAccountKey.json
"""

import os
import logging
from typing import List

logger = logging.getLogger(__name__)

_app = None


def _get_app():
    global _app
    if _app is not None:
        return _app

    key_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
    if not os.path.exists(key_path):
        logger.warning(
            "FCM: serviceAccountKey.json не найден. "
            "Push-уведомления отключены. "
            "Положите ключ в backend/serviceAccountKey.json"
        )
        return None

    try:
        import firebase_admin
        from firebase_admin import credentials
        cred = credentials.Certificate(key_path)
        _app = firebase_admin.initialize_app(cred)
        logger.info("FCM: Firebase Admin SDK инициализирован успешно.")
    except Exception as e:
        logger.error(f"FCM: Ошибка инициализации Firebase: {e}")
        return None

    return _app


def send_push(tokens: List[str], title: str, body: str) -> None:
    """
    Отправляет push-уведомление на список FCM-токенов.
    Тихо завершается (не бросает исключение), если Firebase не настроен.
    """
    if not tokens:
        return

    app = _get_app()
    if app is None:
        return

    try:
        from firebase_admin import messaging
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            tokens=tokens,
        )
        response = messaging.send_each_for_multicast(message)
        logger.info(
            f"FCM: отправлено {response.success_count}/{len(tokens)}, "
            f"ошибок: {response.failure_count}"
        )
    except Exception as e:
        logger.error(f"FCM: Ошибка отправки push: {e}")
