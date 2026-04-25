# prompt.md

## Главный master prompt

```text
Сделай production-ready клон SaaS-системы для управления задачами, проектами, документами и календарным планированием в стиле Weeek, но с уникальным брендом и своим названием.

Ключевые требования:
- Не просто вдохновляться, а повторить архитектуру интерфейса, плотность layout, UX-паттерны, поведение списков, таблиц и планировщика
- Тёмная тема по умолчанию
- Современный productivity SaaS стиль
- Аккуратный левый sidebar
- Компактная типографика
- Мягкие hover-состояния
- Тонкие границы
- Никаких лишних декоративных элементов
- Интерфейс должен быть удобен для ежедневной работы с задачами
- Нужна полная адаптивность: desktop, tablet, mobile
- Приложение должно быть удобным не только на ПК, но и на телефоне
- На мобильном sidebar должен открываться через drawer
- На мобильном таблицы должны иметь горизонтальный скролл, карточечные fallback-представления или адаптированные колонки
- На мобильном weekly view должен уметь переключаться в stacked day mode или compact swipe mode
- Все основные действия должны быть доступны с телефона: создание задачи, редактирование, фильтрация, просмотр проекта, открытие карточки, смена статуса, работа с датой

Сущности системы:
- workspace
- project
- task
- board
- list
- document
- weekly calendar
- user
- assignee
- tag
- priority
- status
- comment
- activity log
- notification
- filters
- attachments

Нужно реализовать:
1. Sidebar navigation
2. Views переключение между list / table / week / board / documents
3. CRUD для задач и проектов
4. Теги, приоритеты, статусы
5. Комментарии и activity history
6. Поиск и фильтрацию
7. Drag and drop
8. Responsive behavior для desktop и mobile
9. Пустые, loading и error состояния
10. Reusable component system
11. Темную тему как основной режим
12. Mock data для демонстрации

Сделай приложение максимально близким по ощущению к Weeek, но с отдельным брендом и без прямого копирования логотипа.
```

## Prompt для общей структуры продукта

```text
Спроектируй полную структуру task management web app в стиле Weeek.

Нужны разделы:
- Мои задачи
- Все задачи
- Все проекты
- Документы
- Шаблоны
- Архив
- Календарь / Неделя
- Канбан доски
- Настройки workspace
- Профиль пользователя

Левый sidebar:
- логотип продукта
- поиск
- основные разделы
- список проектов
- шаблоны
- архив
- кнопка приглашения участников
- компактный dark layout

Основная зона:
- topbar с названием текущего раздела
- кнопки фильтрации
- переключение представлений
- настройки вида
- share / export / date navigation где нужно

Сделай общую архитектуру так, чтобы один и тот же набор задач можно было просматривать в разных режимах:
- list view
- table view
- weekly planner
- board / kanban
- document database style

Особое внимание:
- desktop first, но сразу продумать mobile behavior
- на телефоне вся навигация должна быть доступна без поломки layout
- на телефоне topbar и фильтры должны складываться в компактные панели
- drawers и bottom sheets можно использовать для деталей задачи и фильтров
```

## Prompt для document / table view

```text
Сделай экран document/table view для project management системы, максимально похожий по UX на Weeek.

Экран должен содержать:
- Левый тёмный sidebar
- Разделы: личные, документы, шаблоны, архивные
- Активный документ в sidebar
- Верхнюю панель документа с названием страницы
- По центру большая таблица-документ
- Тёмный фон
- Тонкие серые границы
- Цветные заголовки колонок
- Цветные строки и статусы
- Много пустого рабочего пространства
- Editable grid поведение

Колонки:
- Название компании
- Тип работы
- Ответственный
- Дата поступления
- Дата выполнения
- Статус
- Контакты
- Адрес

Поведение:
- inline editing ячеек
- добавление строк
- создание новых колонок
- выбор типа поля
- sticky header
- row hover
- selected cell state
- keyboard navigation
- copy / paste диапазонов
- column resize
- horizontal scroll
- контекстное меню строки
- быстрый ввод данных как в database/document tools

Mobile behavior:
- на телефоне таблица не должна ломаться
- нужен горизонтальный скролл
- нужен compact режим
- для маленьких экранов можно использовать card representation одной строки
- редактирование строки на телефоне лучше открывать в bottom sheet или modal
```

## Prompt для страницы Мои задачи

```text
Сделай экран "Мои задачи" для SaaS task manager в стиле Weeek.

Структура:
- Тёмный sidebar слева
- Заголовок страницы
- Tabs сверху: назначенные мне, порученные мной, мои приватные задачи
- Список задач с группировкой по времени

Группы:
- Сегодня
- Завтра
- Вчера
- Другие задачи

Колонки:
- Наименование
- Номер
- Исполнитель
- Проект
- Доска
- Колонка
- Дата
- Приоритет
- Теги

Для каждой задачи:
- task title
- маленький ID badge
- аватар исполнителя
- проектный бейдж
- приоритет цветным бейджем
- теги
- состояние завершённости
- strike-through для завершённых задач

Поведение:
- сортировка
- фильтры
- группировка
- collapsing групп
- drag and drop
- открытие detail drawer по клику
- инлайн смена приоритета и статуса
- hover и selected состояния

Mobile behavior:
- на телефоне таблица должна становиться stacked list
- второстепенные колонки скрывать под expandable details
- фильтры открывать в bottom sheet
- detail drawer на телефоне превращать в full-screen sheet
- все действия должны быть доступны большим пальцем
```

## Prompt для weekly planner

```text
Сделай weekly planner view для task management web app, максимально похожий по логике и ощущению на Weeek.

Экран должен включать:
- Левый sidebar
- Верхнюю toolbar
- Переключатель вида "Неделя"
- Фильтры
- Навигацию по дате
- Текущую дату
- Кнопки настроек и share
- Основную сетку по дням недели

Каждый день:
- заголовок дня
- дата
- область "Добавить задачу"
- список карточек задач
- пустая зона для drag and drop

Task card:
- ID badge
- индикатор срочности
- название
- исполнители
- маленькие аватары
- hover state
- selected state
- quick complete action

Поведение:
- drag and drop между днями
- создание задачи в конкретный день
- смена диапазона дат
- фильтр по исполнителю, проекту и тегам
- открытие detail modal
- sticky headers
- compact / comfortable density modes

Mobile behavior:
- на телефоне weekly grid не должна оставаться в 7 узких колонках
- нужен режим вертикального списка дней
- либо horizontal swipe между днями
- карточки должны быть крупнее и удобнее для touch
- создание задачи должно открываться через mobile modal
- переключение дат должно быть доступно с touch controls
```

## Prompt для kanban / board view

```text
Сделай kanban board view для task management системы в стиле Weeek.

Нужно:
- колонки статусов
- карточки задач
- drag and drop между колонками
- быстрые действия на карточке
- теги, даты, исполнители, приоритеты
- topbar с фильтрами и настройками вида
- компактный тёмный интерфейс
- визуально дорогое SaaS-ощущение

Колонки:
- Backlog
- To do
- In progress
- Review
- Done

Поведение:
- создание новой карточки
- добавление новой колонки
- drag and drop
- card modal
- редактирование заголовка
- фильтры по участнику, тегу, дате, проекту

Mobile behavior:
- на телефоне board должен быть swipeable
- колонки должны листаться горизонтально
- карточка должна открываться full-screen
- drag and drop должен быть удобен для touch или должен быть fallback через select status
```

## Prompt для карточки задачи

```text
Сделай task detail modal / drawer для project management системы в стиле Weeek.

Нужно внутри карточки:
- название задачи
- описание
- статус
- приоритет
- дедлайн
- исполнитель
- теги
- проект
- доска
- чеклисты
- комментарии
- activity history
- вложения

Поведение:
- редактирование inline
- autosave или быстрый save
- комментарии снизу
- история изменений
- переключение статуса
- смена исполнителя
- date picker

Desktop behavior:
- справа drawer или centered modal

Mobile behavior:
- full-screen sheet
- верхняя sticky панель действий
- большие touch targets
- комментарии и activity в табах или collapsible блоках
```

## Prompt для дизайна и UI kit

```text
Создай UI kit для task management SaaS в dark theme, в стиле Weeek.

Компоненты:
- sidebar item
- project item
- topbar
- tabs
- table
- badges
- avatars
- chips
- filters
- date picker
- modal
- drawer
- bottom sheet
- buttons
- icon buttons
- dropdowns
- cards
- kanban cards
- inputs
- search
- empty states
- toasts
- loaders

Стиль:
- compact type scale
- тонкие границы
- тёмные поверхности
- спокойные акцентные цвета
- минимализм
- высокая читаемость
- аккуратные скругления
- современный productivity look

Responsive:
- единая дизайн-система для desktop, tablet и phone
- понятные размеры touch targets
- правильные safe area отступы на мобильных
- drawer и bottom sheet для мобильных сценариев
```

## Prompt для frontend реализации

```text
Собери production-ready frontend для task/project management app в стиле Weeek.

Стек:
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui или собственные компоненты
- Zustand или Redux Toolkit
- TanStack Table
- dnd-kit
- date-fns

Требования:
- feature-based structure
- clean architecture
- reusable components
- понятные имена переменных и файлов
- без лишнего мусора в коде
- dark theme first
- responsive layout для desktop и mobile
- touch-friendly mobile interactions
- листы, таблицы, борды, календарь и документы должны использовать общую доменную модель задач
- моки данных и реалистичные демо сценарии
```

## Prompt для backend и БД

```text
Спроектируй backend и базу данных для task/project management SaaS в стиле Weeek.

Стек:
- Node.js / Next.js server routes или отдельный backend
- PostgreSQL
- Prisma ORM
- REST или tRPC

Сущности:
- User
- Workspace
- WorkspaceMember
- Project
- Task
- TaskStatus
- TaskPriority
- Tag
- Comment
- ActivityLog
- Document
- DocumentRow
- DocumentColumn
- ViewSettings
- Notification
- Attachment

Нужно:
- schema prisma
- связи между сущностями
- CRUD endpoints
- фильтрация
- сортировка
- поиск
- комментарии
- activity history
- soft delete
- archive
- role system

Дополнительно:
- структура должна поддерживать разные views для одних и тех же задач
- mobile и desktop клиенты должны использовать один и тот же API
```

## Prompt для mobile-first адаптации

```text
Сделай полную responsive адаптацию task management приложения.

Требования:
- desktop layout не должен ломаться на tablet и phone
- sidebar на mobile превращается в drawer
- фильтры на mobile открываются в bottom sheet
- task detail drawer на mobile становится full-screen modal
- широкие таблицы должны иметь fallback для телефона
- weekly planner на mobile должен иметь отдельный режим показа
- kanban на mobile должен поддерживать touch-friendly horizontal navigation
- topbar должна упрощаться на маленьких экранах
- кнопки и hit areas должны быть удобны для пальца
- fixed headers и safe area должны быть учтены
- не просто ужать desktop версию, а сделать отдельную логику адаптации для телефона
```

## Prompt для финальной сборки всего продукта

```text
Собери полный клон task management SaaS в духе Weeek с собственным брендом.

Нужно реализовать:
- sidebar
- мои задачи
- все задачи
- проекты
- documents / table view
- weekly planner
- kanban board
- task detail modal
- filters
- tags
- priorities
- comments
- activity history
- archive
- templates
- notifications
- responsive mobile support

Ключевые приоритеты:
- максимально близкий UX к Weeek
- чистая архитектура
- переиспользуемые компоненты
- dark theme
- production-ready code
- desktop + mobile
- touch-friendly interactions
- без перегруженного дизайна
- ощущение дорогого рабочего инструмента
```

## Как давать это в AI

```text
Работай поэтапно.
Сначала собери дизайн-систему и layout.
Потом реализуй sidebar и общую навигацию.
Потом экран мои задачи.
Потом table/document view.
Потом weekly planner.
Потом kanban.
Потом task modal.
Потом responsive mobile behavior.
Потом backend schema.
Потом финальную интеграцию.

На каждом шаге соблюдай:
- clean code
- reusable components
- human-readable naming
- no visual trash
- high fidelity to Weeek UX
- full responsive support
```
