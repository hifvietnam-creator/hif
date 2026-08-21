# Ministry raw data — survey

Generated 2026-08-20T10:28:44.336Z · **read-only**

Source: `C:\Users\serve\OneDrive\HIF Data FIles\2025-26 Raw Data`

Written before any schema design. Describes what the files actually
contain rather than what their names suggest.

## 2025  Fall- ALPHA Registration.xlsx

28 KB · 2 sheet(s): Participants, Volunteers

### Participants

103 data rows · 22 columns

- Personal data: Email, Mobile Phone — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | First Name | text | 103/103 | Siona · Jason · Cindy |
| 2 | Last Name | text | 101/103 | Hailu-Mills · Bonne-Gray · Palacios |
| 3 | Email | text | 98/103 | sionagwendoline@gmail.com · jasonbonnegray@hotmail.com · cindypalacios1212@hotmail.co |
| 4 | x | enum(1) | 14/103 | x · x · x |
| 5 | Nationality | text | 69/103 | United Kingdom · United Kingdom · Honduras |
| 6 | Date of Birth | text | 60/103 | 28-11-2005 · Thu Jul 17 2025 23:59:56 GMT · Tue Dec 11 1990 23:59:56 GMT |
| 7 | Mobile Phone | text | 58/103 | 0976 079523 · 376250442 · +50498254750 |
| 8 | Select | enum(2) | 54/103 | Hanoi · Hanoi · Hanoi |
| 9 | Religious affiliation | text | 56/103 | Other · Christian - Catholic · Christian - Protestant |
| 10 | How many Alphas | enum(6) | 56/103 | First ever Alpha · First ever Alpha · 2nd time |
| 11 | How did you hear about Alpha | text | 56/103 | HIF · Through a friend · HIF |
| 12 | What draws you to join Alpha? | text | 44/103 | Building new connections, Ex · Building new connections, Se · Learning about Christianity |
| 13 | Mon Oct 13 2025 23:59:56 GMT+0700 (Indochina Time) | enum(2) | 19/103 | P · P · P |
| 14 | 10212025 | enum(2) | 28/103 | P · P · P |
| 15 | 10/282025 | enum(2) | 35/103 | P · P · P |
| 16 | Thu Apr 10 2025 23:59:56 GMT+0700 (Indochina Time) | enum(2) | 18/103 | P · P · P |
| 17 | Mon Nov 10 2025 23:59:56 GMT+0700 (Indochina Time) | enum(2) | 6/103 | P · p · P |
| 18 | Mon Nov 17 2025 23:59:56 GMT+0700 (Indochina Time) | enum(2) | 12/103 | P · P · P |
| 19 | Mon Nov 24 2025 23:59:56 GMT+0700 (Indochina Time) | enum(2) | 22/103 | P · P · P |
| 20 | De 2nd 2025 | enum(2) | 8/103 | p · p · p |
| 21 | Mon Dec 08 2025 23:59:56 GMT+0700 (Indochina Time) | enum(2) | 7/103 | p · p · p |
| 22 | Mon Dec 15 2025 23:59:56 GMT+0700 (Indochina Time) | enum(1) | 34/103 | p · p · p |

### Volunteers

19 data rows · 6 columns

- Name only, no email — matching to PCO people will be unreliable.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Name | text | 19/19 | Jimmy · Mic  · Rahel  |
| 2 | Mon Nov 17 2025 23:59:56 GMT+0700 (Indochina Time) | enum(1) | 14/19 | P · P · P |
| 3 | Mon Nov 24 2025 23:59:56 GMT+0700 (Indochina Time) | enum(1) | 14/19 | P · P · P |
| 4 | Tue Feb 11 2025 23:59:56 GMT+0700 (Indochina Time) | enum(1) | 10/19 | P · P · P |
| 5 | 12//09/2025 | enum(1) | 8/19 | p · p · p |
| 6 | 16/12/2025 | enum(1) | 14/19 | p · p · p |

## 2025 Spring -ALPHA Beyond Registration.xlsx

82 KB · 3 sheet(s): Alpha Guests, SMALL GROUPS, budget

### Alpha Guests

66 data rows · 26 columns

- 13 unnamed column(s)
- Personal data: Email, Mobile Phone — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | First Name | text | 66/66 | Thu · Minh Hieu · Thu |
| 2 | Last Name | text | 65/66 | Trieu · Nguyen · Lan |
| 3 | Email | text | 66/66 | thutrieu9996@gmail.com · chplay231@gmail.com · lan18102004@gmail.com |
| 4 | Nationality | text | 66/66 | Vietnam · Vietnam · Vietnam |
| 5 | Date of Birth | date? | 66/66 | 35317 · 33695 · 45644 |
| 6 | Mobile Phone | text | 66/66 | 965647880 · +84387246045 · 385857028 |
| 7 | I want to join an Alpha Small Group in | text | 55/66 | Ngoai Giao Doan (Bac Tu Liem · Ngoai Giao Doan (Bac Tu Liem · Nam Tu Liem |
| 8 | How did you hear? | text | 66/66 | ["Building new connections"] · ["Building new connections", · ["Building new connections", |
| 9 | Who invited you? | text | 18/66 | Jimmy Lee · Jimmy’s group · Jackie Cho - Mr. Cho Seongok |
| 10 | Religious affiliation | enum(8) | 66/66 | None · Atheist · None |
| 11 | How many Alphas | enum(4) | 66/66 | First ever Alpha · First ever Alpha · First ever Alpha |
| 12 | PRERRED SMALL GROUP | empty | 0/66 | — |
| 13 | Small Group | empty | 0/66 | — |
| 14 | (col 14) | integer | 34/66 | 1 · 2 · 3 |
| 15 | (col 15) | empty | 0/66 | — |
| 16 | (col 16) | empty | 0/66 | — |
| 17 | (col 17) | empty | 0/66 | — |
| 18 | (col 18) | empty | 0/66 | — |
| 19 | (col 19) | empty | 0/66 | — |
| 20 | (col 20) | empty | 0/66 | — |
| 21 | (col 21) | empty | 0/66 | — |
| 22 | (col 22) | empty | 0/66 | — |
| 23 | (col 23) | empty | 0/66 | — |
| 24 | (col 24) | empty | 0/66 | — |
| 25 | (col 25) | empty | 0/66 | — |
| 26 | (col 26) | empty | 0/66 | — |

### SMALL GROUPS

2 data rows · 3 columns

- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Host | enum(1) | 1/2 | Aaron & Regina |
| 2 | Helper | enum(2) | 2/2 | Solomon · Phuc |
| 3 | Members | empty | 0/2 | — |

### budget

10 data rows · 26 columns

- 20 unnamed column(s)
- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Column 1 | text | 7/10 | aaron · mic · hoa |
| 2 | Column 2 | integer | 7/10 | 13 · 7 · 7 |
| 3 | $ per person | integer | 8/10 | 90000 · 1170000 · 630000 |
| 4 | conversion | number | 8/10 | 25000 · 46.8 · 25.2 |
| 5 | weeks | integer | 10/10 | 10 · 468 · 252 |
| 6 | Column 3 | integer | 7/10 | 11700000 · 6300000 · 6300000 |
| 7 | (col 7) | empty | 0/10 | — |
| 8 | (col 8) | empty | 0/10 | — |
| 9 | (col 9) | empty | 0/10 | — |
| 10 | (col 10) | empty | 0/10 | — |
| 11 | (col 11) | empty | 0/10 | — |
| 12 | (col 12) | empty | 0/10 | — |
| 13 | (col 13) | empty | 0/10 | — |
| 14 | (col 14) | empty | 0/10 | — |
| 15 | (col 15) | empty | 0/10 | — |
| 16 | (col 16) | empty | 0/10 | — |
| 17 | (col 17) | empty | 0/10 | — |
| 18 | (col 18) | empty | 0/10 | — |
| 19 | (col 19) | empty | 0/10 | — |
| 20 | (col 20) | empty | 0/10 | — |
| 21 | (col 21) | empty | 0/10 | — |
| 22 | (col 22) | empty | 0/10 | — |
| 23 | (col 23) | empty | 0/10 | — |
| 24 | (col 24) | empty | 0/10 | — |
| 25 | (col 25) | empty | 0/10 | — |
| 26 | (col 26) | empty | 0/10 | — |

## 2025-05-01-to-2026-04-21 - All Groups attendance.xlsx

25 KB · 1 sheet(s): event-attendance-2025-05-01-to-

### event-attendance-2025-05-01-to-

128 data rows · 26 columns

- 10 unnamed column(s)
- Name only, no email — matching to PCO people will be unreliable.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Group name | enum(16) | 128/128 | YEPpers · YEPpers · YEPpers |
| 2 | Group type | enum(2) | 128/128 | Connect Groups · Connect Groups · Connect Groups |
| 3 | Tags | enum(13) | 108/128 | Regularity: Weekly, Stage of · Regularity: Weekly, Stage of · Regularity: Weekly, Stage of |
| 4 | Leaders | enum(16) | 128/128 | Botros Makar [botrosazizbotr · Botros Makar [botrosazizbotr · Botros Makar [botrosazizbotr |
| 5 | Members count | integer | 128/128 | 5 · 8 · 7 |
| 6 | Event name | text | 128/128 | Weekly YEPpers Meetings · Weekly YEPpers Meetings · Weekly YEPpers Meetings |
| 7 | Event start time | date? | 128/128 | Fri Oct 03 2025 18:29:56 GMT · Fri Oct 17 2025 18:29:56 GMT · Fri Oct 31 2025 18:29:56 GMT |
| 8 | Event end time | date? | 128/128 | Fri Oct 03 2025 20:29:56 GMT · Fri Oct 17 2025 20:29:56 GMT · Fri Oct 31 2025 20:29:56 GMT |
| 9 | Location | enum(4) | 80/128 | Westlake Area · Westlake Area · Westlake Area |
| 10 | Event notes | enum(4) | 4/128 | Maria  · Joy Há»“ng, Brooklyn Van, Sa · Joy Hong, Sara Ralph, Brookl |
| 11 | Total attended count | integer | 128/128 | 4 · 5 · 2 |
| 12 | Members attended count | integer | 128/128 | 4 · 5 · 2 |
| 13 | Visitors attended count | integer | 128/128 | 0 · 0 · 0 |
| 14 | Group attendance report url | enum(16) | 128/128 | https://groups.planningcente · https://groups.planningcente · https://groups.planningcente |
| 15 | Attended names | text | 125/128 | Botros Makar, Nermin Yassin, · Botros Makar, Holly Duong, K · Botros Makar, Nermin Yassin |
| 16 | Absent names | text | 123/128 | Marian Tabjan · Marian Tabjan, Shilpa Stanle · Holly Duong, Jack Moore, Kha |
| 17 | (col 17) | empty | 0/128 | — |
| 18 | (col 18) | empty | 0/128 | — |
| 19 | (col 19) | empty | 0/128 | — |
| 20 | (col 20) | empty | 0/128 | — |
| 21 | (col 21) | empty | 0/128 | — |
| 22 | (col 22) | empty | 0/128 | — |
| 23 | (col 23) | empty | 0/128 | — |
| 24 | (col 24) | empty | 0/128 | — |
| 25 | (col 25) | empty | 0/128 | — |
| 26 | (col 26) | empty | 0/128 | — |

## 2025-12-07_PASKONG_PINOY_2025-12-06_05_46_56_1.xlsx

18 KB · 1 sheet(s): Sheet1

### Sheet1

86 data rows · 8 columns

- Personal data: Email, Phone Number — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Submission Date | date? | 86/86 | Dec 6, 2025 · Dec 6, 2025 · Dec 6, 2025 |
| 2 | Name | text | 86/86 | Patricia Aquino · Olivia Dolteo · Agosto Tigue |
| 3 | Email | text | 86/86 | aquino103664@stu.vinschool.e · livdolteo@gmail.com · ashshe21@gmail.com |
| 4 | Phone Number | text | 86/86 | 0386918663 · 0842212971 · 0395681271 |
| 5 | City in the Philippines ( Your Hometown) | text | 86/86 | Manila · Baguio City · Cavitecau |
| 6 | Unique ID | integer | 86/86 | 0093 · 0092 · 0091 |
| 7 | Place of Residence in Vietnam (District + City) i.e. Tay Ho, Hanoi | text | 86/86 | Tay mo · Lac Long Quan, Tay Ho · Cau Giay |
| 8 | Prayer Request (OPTIONAL) | text | 35/86 | God's Best!😀 · Good health · Good health |

## 2026 - AFRICAN FELLOWSHIP  attendance List April and March.csv

3 KB · 1 sheet(s): Sheet1

### Sheet1

73 data rows · 7 columns

- **Wide format**: 2 columns are dates (22/3/2026, 19/4/2026…). One column per event — needs unpivoting into rows before import.
- Name only, no email — matching to PCO people will be unreliable.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | first name | text | 73/73 | Oluwatomisin · Kingsley · Oluwatobi |
| 2 | last name | text | 73/73 | Ogunbawo · Effiong · Adeyinka |
| 3 | percent | enum(4) | 73/73 | 1 · 1 · 0 |
| 4 | events attended | integer | 73/73 | 2 · 2 · 0 |
| 5 | events | integer | 73/73 | 2 · 2 · 2 |
| 6 | 22/3/2026 | enum(3) | 35/73 | attended as leader · attended as member · attended as member |
| 7 | 19/4/2026 | enum(3) | 34/73 | attended as leader · attended as member · attended as member |

## 2026-03-09 - Pickleball.xlsx

8337 KB · 15 sheet(s): ECOPARK QR RESPONSES_pickleball, HANOI QR RESPONSES, DO NOT EDIT, TALLY, VOLLEYBALL-PLAYERS, PICKLEBALL-PLAYERS, PICKLEBALL ATTENDANCE-MAR 10, PICKLEBALL ATTENDANCE-MAR 11 an, VOLLEYBALL ATTENDANCE-MAR 13-15, PICKLEBALL TALLY SHEET, Copy of PICKLEBALL TALLY SHEET, VOLUNTEERS, VOLLEYBALL ATTENDANCE-to be pri, VOLUNTEERS SCHEDULE, NOT INDICATED

### ECOPARK QR RESPONSES_pickleball

31 data rows · 35 columns

- 29 unnamed column(s)
- Personal data: Email Address, Zalo Phone Number — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Timestamp | date? | 31/31 | Sun Mar 01 2026 13:30:48 GMT · Sat Feb 28 2026 14:37:40 GMT · Sat Feb 28 2026 14:54:43 GMT |
| 2 | Email Address | text | 31/31 | jaco.duplessis1998@gmail.com · queenstownacademy@gmail.com · edward_pinchess@hotmail.com |
| 3 | Full Name | text | 31/31 | JACO DU PLESSIS · MARK VELDMAN · ED PINCHESS |
| 4 | Zalo Phone Number | text | 31/31 | 812455442 · O369948302 · 0865365140 |
| 5 | Your Skill Level | enum(3) | 31/31 | Advanced · Beginner · Beginner |
| 6 | Do you have your own paddle? | boolean? | 31/31 | Yes · Yes · Yes |
| 7 | (col 7) | empty | 0/31 | — |
| 8 | (col 8) | empty | 0/31 | — |
| 9 | (col 9) | empty | 0/31 | — |
| 10 | (col 10) | empty | 0/31 | — |
| 11 | (col 11) | empty | 0/31 | — |
| 12 | (col 12) | empty | 0/31 | — |
| 13 | (col 13) | empty | 0/31 | — |
| 14 | (col 14) | empty | 0/31 | — |
| 15 | (col 15) | empty | 0/31 | — |
| 16 | (col 16) | empty | 0/31 | — |
| 17 | (col 17) | empty | 0/31 | — |
| 18 | (col 18) | empty | 0/31 | — |
| 19 | (col 19) | empty | 0/31 | — |
| 20 | (col 20) | empty | 0/31 | — |
| 21 | (col 21) | empty | 0/31 | — |
| 22 | (col 22) | empty | 0/31 | — |
| 23 | (col 23) | empty | 0/31 | — |
| 24 | (col 24) | empty | 0/31 | — |
| 25 | (col 25) | empty | 0/31 | — |
| 26 | (col 26) | empty | 0/31 | — |
| 27 | (col 27) | empty | 0/31 | — |
| 28 | (col 28) | empty | 0/31 | — |
| 29 | (col 29) | empty | 0/31 | — |
| 30 | (col 30) | empty | 0/31 | — |
| 31 | (col 31) | empty | 0/31 | — |
| 32 | (col 32) | empty | 0/31 | — |
| 33 | (col 33) | empty | 0/31 | — |
| 34 | (col 34) | empty | 0/31 | — |
| 35 | (col 35) | empty | 0/31 | — |

### HANOI QR RESPONSES

84 data rows · 35 columns

- 6 unnamed column(s)
- Personal data: Phone Number / Số điện thoại, Email, Email Address, Email Address 2 — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Timestamp | date? | 81/84 | Sat Feb 28 2026 10:37:19 GMT · Sun Feb 08 2026 12:40:05 GMT · Sun Feb 08 2026 12:44:20 GMT |
| 2 | Full Name / Họ và tên đầy đủ | text | 81/84 | Ceejay Galicia · Ardent Rhodora Sagayon Palas · Glenda Pitas |
| 3 | Phone Number / Số điện thoại | text | 79/84 | 347402293 · 0936117847 · 0363949241 |
| 4 | Email | text | 72/84 | galiciaceejay@gmail.com · Palasolardentrhodora@gmail.c · Glendapitas262@gmail.com |
| 5 | Email Address | text | 63/84 | galiciaceejay@gmail.com · Palasolardentrhodora@gmail.c · glendapitas262@gmail.com |
| 6 | Which sport(s) would you like to join ? / Bạn muốn tham gia môn thể thao nào? | enum(8) | 84/84 | Both · Both · Both |
| 7 | Your skill level / Trình độ kỹ năng của bạn | enum(10) | 79/84 | Intermediate · Intermediate · Intermediate |
| 8 | Which dates are you available ? / Bạn rảnh vào những ngày nào? | text | 81/84 | March 12, March 13, March 14 · March 15, March 16 · March 10, March 16 |
| 9 | How Would You Like to Be Involved? / Bạn muốn tham gia như thế nào? | text | 81/84 | Play in clinics or games · Play in clinics or games, Jo · Play in clinics or games, Jo |
| 10 | Languages you speak / Ngôn ngữ bạn nói | text | 79/84 | English · English · English |
| 11 | How did you hear about this event? / Bạn biết đến sự kiện này bằng cách nào? | text | 70/84 | Friends · Friend · I joined the last league. I  |
| 12 | Email Address 2 | text | 70/84 | galiciaceejay@gmail.com · Palasolardentrhodora@gmail.c · glendapitas262@gmail.com |
| 13 | Available Time  [Tuesday ] | enum(3) | 13/84 | 9am -11am, 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 14 | [Wednesday / Thứ Tư] | enum(3) | 19/84 | 9am -11am, 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 15 | Available Time  [Thursday] | enum(3) | 14/84 | 6pm - 9pm · 9am -11am, 6pm - 9pm · 9am -11am |
| 16 | [Friday / Thứ sáu] | enum(3) | 19/84 | 6pm - 9pm · 9am -11am, 6pm - 9pm · 6pm - 9pm |
| 17 | [Saturday / Thứ bảy] | text | 25/84 | 9am -11am · 9am -11am, 1pm - 3pm, 6pm -  · 9am -11am |
| 18 | [Sunday / Chủ nhật] | enum(4) | 22/84 | 4pm - 5:30pm, 6pm - 9pm · 6pm - 8pm · 4pm - 5:30pm |
| 19 | Interested Location / Địa điểm quan tâm | enum(2) | 40/84 | Hanoi · Hanoi · Hanoi |
| 20 | Column 18 | empty | 0/84 | — |
| 21 | [Friday / Thứ sáu] 2 | enum(3) | 11/84 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 22 | [Saturday / Thứ bảy] 2 | enum(3) | 28/84 | 9am-2pm · 9am-2pm, 6pm - 9pm · 9am-2pm |
| 23 | [Sunday / Chủ nhật] 2 | enum(1) | 23/84 | 4pm - 7pm · 4pm - 7pm · 4pm - 7pm |
| 24 | Tuesday / Thứ ba | enum(1) | 4/84 | 9am -11am · 9am -11am · 9am -11am |
| 25 | Additional Information (For pickleball players, what is your current DUPR level?) / Thông tin bổ sung (Đối với người chơi pickleball, trình độ DUPR hiện tại của bạn là gì?) | enum(3) | 3/84 | Beginner · No rating · DUPR 3.5 |
| 26 | Friday | empty | 0/84 | — |
| 27 | Column 25 | empty | 0/84 | — |
| 28 | [Row 2] | empty | 0/84 | — |
| 29 | Column 18 2 | empty | 0/84 | — |
| 30 | (col 30) | empty | 0/84 | — |
| 31 | (col 31) | empty | 0/84 | — |
| 32 | (col 32) | empty | 0/84 | — |
| 33 | (col 33) | empty | 0/84 | — |
| 34 | (col 34) | empty | 0/84 | — |
| 35 | (col 35) | empty | 0/84 | — |

### DO NOT EDIT

78 data rows · 38 columns

- Duplicate column names: Email Address
- 4 unnamed column(s)
- Personal data: Phone / WhatsApp Number, Email Address, Email Address — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Timestamp | date? | 78/78 | Sun Feb 08 2026 12:40:05 GMT · Sat Feb 28 2026 10:37:19 GMT · Sun Feb 08 2026 12:44:20 GMT |
| 2 | Full Name | text | 78/78 | ARDENT RHODORA SAGAYON PALAS · CEEJAY GALICIA · GLENDA PITAS |
| 3 | Phone / WhatsApp Number | text | 76/78 | 0936117847 · 347402293 · 0363949241 |
| 4 | Email Address | text | 76/78 | Palasolardentrhodora@gmail.c · galiciaceejay@gmail.com · glendapitas262@gmail.com |
| 5 | Which sport(s) would you like to join ? | enum(5) | 78/78 | Both · Both · Both |
| 6 | Your skill level | enum(10) | 76/78 | Intermediate · Intermediate · Intermediate |
| 7 | Which dates are you available? | text | 78/78 | March 15, March 16 · March 12, March 13, March 14 · March 10, March 16 |
| 8 | MAR 10 | enum(2) | 22/78 | Mon Mar 09 2026 23:59:56 GMT · Mon Mar 09 2026 23:59:56 GMT · Mon Mar 09 2026 23:59:56 GMT |
| 9 | MAR 11 | enum(2) | 20/78 | Tue Mar 10 2026 23:59:56 GMT · Tue Mar 10 2026 23:59:56 GMT · Tue Mar 10 2026 23:59:56 GMT |
| 10 | MAR 12 | enum(2) | 21/78 | Wed Mar 11 2026 23:59:56 GMT · Wed Mar 11 2026 23:59:56 GMT · Wed Mar 11 2026 23:59:56 GMT |
| 11 | MAR 13 | enum(3) | 27/78 | Thu Mar 12 2026 23:59:56 GMT · Thu Mar 12 2026 23:59:56 GMT · Thu Mar 12 2026 23:59:56 GMT |
| 12 | MAR 14 | date? | 47/78 | Fri Mar 13 2026 23:59:56 GMT · Fri Mar 13 2026 23:59:56 GMT · Fri Mar 13 2026 23:59:56 GMT |
| 13 | MAR 15 | date? | 43/78 | Sat Mar 14 2026 23:59:56 GMT · Sat Mar 14 2026 23:59:56 GMT · Sat Mar 14 2026 23:59:56 GMT |
| 14 | MAr 16 | enum(2) | 19/78 | Sun Mar 15 2026 23:59:56 GMT · Sun Mar 15 2026 23:59:56 GMT · Sun Mar 15 2026 23:59:56 GMT |
| 15 | How Would You Like to Be Involved? | text | 77/78 | Play in clinics or games, Jo · Play in clinics or games · Play in clinics or games, Jo |
| 16 | Languages you speak | text | 75/78 | English · English · English |
| 17 | How did you hear about this event? | text | 66/78 | Friend · Friends · I joined the last league. I  |
| 18 | Email Address | text | 68/78 | Palasolardentrhodora@gmail.c · galiciaceejay@gmail.com · glendapitas262@gmail.com |
| 19 | Available Time  [Tuesday-Morning] | enum(2) | 5/78 | 9am -11am · 9am -11am · 9am -11am |
| 20 | Available Time  [Tuesday-Evening] | enum(2) | 14/78 |  6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 21 | Available Time  [Wednesday-morning] | enum(3) | 7/78 | 9am-2pm, 6pm - 9pm · 9am-2pm, 6pm - 9pm · 6pm - 9pm |
| 22 | Available Time  [Wednesday-evening] | enum(6) | 23/78 | 9am -11am, 6pm - 9pm · 9am -11am · 6pm - 9pm |
| 23 | Available Time  [Thursday] | enum(4) | 16/78 | 6pm - 9pm · 9am -11am, 6pm - 9pm · 6pm - 9pm |
| 24 | Available Time  [Friday-AM] | enum(1) | 4/78 | 9am -11am · 9am -11am · 9am -11am |
| 25 | Available Time  [Friday-PM] | enum(2) | 19/78 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 26 | [Saturday] | enum(2) | 19/78 | 9am -11am · 9am -11am · 9am -11am |
| 27 | [Saturday] 2 | enum(4) | 13/78 | 1pm - 3pm · 1pm - 3pm · 1pm - 3pm |
| 28 | [Saturday] 3 | enum(3) | 33/78 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 29 | [Sunday] | enum(2) | 27/78 | 4pm - 5:30pm · 4pm - 7pm · 4pm - 5:30pm |
| 30 | [Sunday] 2 | enum(3) | 23/78 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 31 | Interested Location | enum(2) | 29/78 | Hanoi · Hanoi · Hanoi |
| 32 | Column 1 | empty | 0/78 | — |
| 33 | Column 2 | empty | 0/78 | — |
| 34 | Column 3 | empty | 0/78 | — |
| 35 | (col 35) | empty | 0/78 | — |
| 36 | (col 36) | empty | 0/78 | — |
| 37 | (col 37) | empty | 0/78 | — |
| 38 | (col 38) | empty | 0/78 | — |

### TALLY

47 data rows · 22 columns · header on row 3

- Duplicate column names: 9am-11am, 6pm-9pm
- 16 unnamed column(s)
- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | TIME | text | 40/47 | LOCATION · Number of players per time s · Number of players by date |
| 2 | 9am-11am | text | 38/47 | 35 Trần Quý Kiên · 10 · 11 |
| 3 | 9am-11am | text | 27/47 | 35 Trần Quý Kiên · 0 · 9 |
| 4 | 6pm-9pm | text | 27/47 | 35 Trần Quý Kiên · 11 · TOTAL |
| 5 | 9am-11am | text | 11/47 | 35 Trần Quý Kiên · 1 · 12 |
| 6 | 6pm-9pm | enum(6) | 7/47 | Green Tay Ho · 10 · PM |
| 7 | (col 7) | enum(5) | 5/47 | MAR 14, SAT · AM · 27 |
| 8 | (col 8) | enum(5) | 5/47 | as of MAR 07 · Note: There is a discrepancy · PM |
| 9 | (col 9) | enum(2) | 3/47 | MAR 15, SUN · 34 · 34 |
| 10 | (col 10) | integer | 2/47 | 90 · 94 |
| 11 | (col 11) | empty | 0/47 | — |
| 12 | (col 12) | empty | 0/47 | — |
| 13 | (col 13) | empty | 0/47 | — |
| 14 | (col 14) | empty | 0/47 | — |
| 15 | (col 15) | empty | 0/47 | — |
| 16 | (col 16) | empty | 0/47 | — |
| 17 | (col 17) | empty | 0/47 | — |
| 18 | (col 18) | empty | 0/47 | — |
| 19 | (col 19) | empty | 0/47 | — |
| 20 | (col 20) | empty | 0/47 | — |
| 21 | (col 21) | empty | 0/47 | — |
| 22 | (col 22) | empty | 0/47 | — |

### VOLLEYBALL-PLAYERS

33 data rows · 38 columns

- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Column 1 | date? | 33/33 | Wed Mar 04 2026 23:42:50 GMT · Wed Feb 25 2026 21:14:57 GMT · Sun Mar 01 2026 16:03:33 GMT |
| 2 | Column 2 | text | 33/33 | NGUYỄN HỮU HIẾU · KEM CHU · DARWIN TAMPOS NARCA |
| 3 | Column 3 | text | 32/33 | 0816989860 · +84 96 8647033 · 0869592755 |
| 4 | Column 4 | text | 31/33 | neecygaming@gmail.com · chuvan2010@gmail.com · darwinnarca10@gmail.com |
| 5 | Column 5 | enum(4) | 33/33 | Volleyball / Bóng chuyền · Volleyball · Volleyball |
| 6 | Column 6 | enum(5) | 33/33 | Advanced · Beginner  · Beginner  |
| 7 | Column 7 | text | 33/33 | Sat, Mar 14 Pickleball (AM & · March 10, March 11, March 12 · FRIDAY, March 13  VOLLEYBALL |
| 8 | Column 11 | date? | 11/33 | Thu Mar 12 2026 23:59:56 GMT · Thu Mar 12 2026 23:59:56 GMT · Thu Mar 12 2026 23:59:56 GMT |
| 9 | Column 12 | date? | 28/33 | Fri Mar 13 2026 23:59:56 GMT · Fri Mar 13 2026 23:59:56 GMT · Fri Mar 13 2026 23:59:56 GMT |
| 10 | Column 13 | date? | 24/33 | Sat Mar 14 2026 23:59:56 GMT · Sat Mar 14 2026 23:59:56 GMT · Sat Mar 14 2026 23:59:56 GMT |
| 11 | Column 15 | text | 33/33 | Play in clinics or games / T · Just want to learn more firs · Play in clinics or games |
| 12 | Column 16 | text | 32/33 | Vietnamese / Tiếng Việt, Eng · Vietnamese, English · English |
| 13 | Column 17 | text | 26/33 | Qua clb DVA · Secret · Hif friends |
| 14 | Column 18 | text | 24/33 | Sat, Mar 14 Pickleball (AM & · chuvan2010@gmail.com · darwinnarca10@gmail.com |
| 15 | Column 19 | empty | 0/33 | — |
| 16 | Column 20 | enum(1) | 2/33 | 6pm - 9pm · 6pm - 9pm |
| 17 | Column 21 | enum(1) | 2/33 | 6pm - 9pm · 6pm - 9pm |
| 18 | Column 22 | enum(1) | 3/33 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 19 | Column 23 | enum(2) | 3/33 | 6pm - 9pm · 6pm - 9pm · 9am -11am |
| 20 | Column 24 | enum(3) | 4/33 | 6pm - 8pm · 9am-2pm, 6pm - 9pm · 9am-2pm, 6pm - 9pm |
| 21 | Column 25 | enum(4) | 9/33 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 22 | Column 26 | enum(3) | 8/33 | 9am-2pm · 9am-2pm · 9am-2pm |
| 23 | Column 27 | enum(5) | 6/33 | 1pm - 3pm · 9am -11am, 6pm - 9pm · 4pm - 7pm |
| 24 | Column 28 | enum(3) | 16/33 | 9am-2pm, 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 25 | Column 29 | enum(2) | 16/33 | 4pm - 7pm · 4pm - 5:30pm · 4pm - 7pm |
| 26 | Column 30 | enum(1) | 4/33 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 27 | Column 31 | enum(2) | 7/33 | Hanoi · Ecopark · Ecopark |
| 28 | Column 32 | empty | 0/33 | — |
| 29 | Column 33 | empty | 0/33 | — |
| 30 | Column 34 | empty | 0/33 | — |
| 31 | Column 35 | empty | 0/33 | — |
| 32 | Column 36 | empty | 0/33 | — |
| 33 | Column 37 | empty | 0/33 | — |
| 34 | Column 38 | empty | 0/33 | — |
| 35 | Column 39 | empty | 0/33 | — |
| 36 | Column 40 | empty | 0/33 | — |
| 37 | Column 41 | empty | 0/33 | — |
| 38 | Column 42 | empty | 0/33 | — |

### PICKLEBALL-PLAYERS

28 data rows · 36 columns

- 5 unnamed column(s)
- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Column 1 | date? | 28/28 | Sat Feb 28 2026 08:26:57 GMT · Thu Feb 26 2026 18:43:33 GMT · Thu Feb 26 2026 20:44:11 GMT |
| 2 | Column 2 | text | 28/28 | LITHA VICTORIA NKIHLANA · NGO VIET HA · VU NGO TRA MY |
| 3 | Column 3 | text | 28/28 | +27 693 016 527  · 0888351608 · 0962351837 |
| 4 | Column 4 | text | 27/28 | nkihlanal@gmail.com · ngovietha200603@gmail.com · vungotramy176@gmail.com |
| 5 | Column 6 | enum(2) | 27/28 | Beginner  · Beginner  · Beginner  |
| 6 | Column 7 | text | 28/28 | March 10, March 12, March 13 · March 10, March 11, March 12 · March 11, March 12, March 13 |
| 7 | Column 8 | date? | 13/28 | Mon Mar 09 2026 23:59:56 GMT · Mon Mar 09 2026 23:59:56 GMT · Mon Mar 09 2026 23:59:56 GMT |
| 8 | Column 9 | date? | 12/28 | Tue Mar 10 2026 23:59:56 GMT · Tue Mar 10 2026 23:59:56 GMT · Tue Mar 10 2026 23:59:56 GMT |
| 9 | Column 10 | date? | 13/28 | Thu Mar 12 2026 23:59:56 GMT · Thu Mar 12 2026 23:59:56 GMT · Thu Mar 12 2026 23:59:56 GMT |
| 10 | Column 11 | date? | 16/28 | Fri Mar 13 2026 23:59:56 GMT · Fri Mar 13 2026 23:59:56 GMT · Fri Mar 13 2026 23:59:56 GMT |
| 11 | Column 12 | enum(2) | 14/28 | Sat Mar 14 2026 23:59:56 GMT · Sat Mar 14 2026 23:59:56 GMT · Sat Mar 14 2026 23:59:56 GMT |
| 12 | Column 13 | enum(3) | 10/28 | Sun Mar 15 2026 23:59:56 GMT · Sun Mar 15 2026 23:59:56 GMT · Sun Mar 15 2026 23:59:56 GMT |
| 13 | Column 14 | text | 28/28 | Join the Sports Outreach Wor · Just want to learn more firs · Play in clinics or games, Ju |
| 14 | Column 15 | enum(6) | 28/28 | English · Vietnamese, English · Vietnamese, English |
| 15 | Column 16 | text | 25/28 | At HIF  · from one of my friends  · Yes |
| 16 | Column 17 | text | 27/28 | nkihlanal@gmail.com · ngovietha200603@gmail.com · vungotramy176@gmail.com |
| 17 | Column 18 | enum(3) | 3/28 | Column 19 · 9am -11am · 9am -11am, 6pm - 9pm |
| 18 | Column 19 | enum(2) | 9/28 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 19 | Column 20 | enum(1) | 1/28 | Column 21 |
| 20 | Column 21 | enum(4) | 12/28 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 21 | Column 22 | enum(3) | 10/28 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 22 | Column 23 | enum(2) | 2/28 | Column 24 · 9am -11am |
| 23 | Column 24 | enum(3) | 11/28 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 24 | Column 25 | enum(2) | 5/28 | 9am -11am · 9am -11am · 9am -11am |
| 25 | Column 26 | enum(2) | 2/28 | 1pm - 3pm · Column 27 |
| 26 | Column 27 | enum(2) | 10/28 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 27 | Column 28 | enum(3) | 4/28 | 4pm - 5:30pm · 4pm - 7pm · Column 29 |
| 28 | Column 29 | enum(4) | 11/28 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 29 | Column 30 | enum(3) | 12/28 | Ecopark · Hanoi · Hanoi |
| 30 | Column 31 | enum(1) | 1/28 | Column 32 |
| 31 | Column 32 | enum(1) | 1/28 | Column 33 |
| 32 | (col 32) | empty | 0/28 | — |
| 33 | (col 33) | empty | 0/28 | — |
| 34 | (col 34) | empty | 0/28 | — |
| 35 | (col 35) | empty | 0/28 | — |
| 36 | (col 36) | empty | 0/28 | — |

### PICKLEBALL ATTENDANCE-MAR 10

91 data rows · 10 columns · header on row 5

- 2 unnamed column(s)
- Personal data: PHONE NUMBER, EMAIL — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | NO. | text | 88/91 | 1 · 2 · 3 |
| 2 | NAME | text | 23/91 | KIEN VU · LITHA VICTORIA NKIHLANA · LYLA THANH XUAN |
| 3 | PHONE NUMBER | text | 26/91 | 0399842021 · +27 693 016 527  · 0868088358 |
| 4 | EMAIL | text | 23/91 | kienvu9988@gmail.com · nkihlanal@gmail.com · lylathanhxuan@gmail.com |
| 5 | LEVEL | enum(4) | 23/91 | Beginner  · Beginner  · Beginner  |
| 6 | REGISTRATION FEE | enum(2) | 79/91 | false · false · false |
| 7 | INTERESTED in PICKLEBALL MEMBERSHIP? | enum(3) | 29/91 | YES · false · false |
| 8 | (col 8) | enum(3) | 29/91 | NO · REGISTRATION FEE · false |
| 9 | (col 9) | enum(3) | 4/91 | ALREADY A MEMBER · INTERESTED in PICKLEBALL MEM · YES |
| 10 | SIGNATURE | enum(2) | 2/91 | NO · SIGNATURE |

### PICKLEBALL ATTENDANCE-MAR 11 an

154 data rows · 12 columns · header on row 5

- 3 unnamed column(s)
- Personal data: PHONE NUMBER, EMAIL — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | NO. | text | 147/154 | 1 · 2 · 3 |
| 2 | NAME | text | 58/154 | LYLA THANH XUAN · NGO VIET HA · VU NGO TRA MY |
| 3 | PHONE NUMBER | text | 64/154 | 0868088358 · 0888351608 · 0962351837 |
| 4 | EMAIL | text | 57/154 | lylathanhxuan@gmail.com · ngovietha200603@gmail.com · vungotramy176@gmail.com |
| 5 | LEVEL | enum(3) | 57/154 | Beginner · Beginner · Beginner |
| 6 | AVAILABLE SESSION | enum(3) | 141/154 | AM · false · false |
| 7 | (col 7) | enum(2) | 137/154 | PM · false · false |
| 8 | REGISTRATION FEE | enum(2) | 108/154 | false · false · false |
| 9 | INTERESTED in PICKLEBALL MEMBERSHIP? | enum(2) | 9/154 | YES · INTERESTED in PICKLEBALL MEM · YES |
| 10 | (col 10) | boolean? | 5/154 | NO · NO · NO |
| 11 | (col 11) | enum(1) | 5/154 | ALREADY A MEMBER · ALREADY A MEMBER · ALREADY A MEMBER |
| 12 | SIGNATURE | enum(1) | 4/154 | SIGNATURE · SIGNATURE · SIGNATURE |

### VOLLEYBALL ATTENDANCE-MAR 13-15

171 data rows · 12 columns · header on row 5

- 3 unnamed column(s)
- Personal data: PHONE NUMBER, EMAIL — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | NO. | text | 116/171 | 1 · 2 · 3 |
| 2 | NAME | text | 59/171 | NGUYỄN HỮU HIẾU · KHOSI MORIRI · PATRICIA AQUINO |
| 3 | PHONE NUMBER | text | 62/171 | 0816989860 · 0326248294 · 0386918663 |
| 4 | EMAIL | text | 56/171 | neecygaming@gmail.com · khosimoriri@gmail.com · patriciaaquino27@icloud.com |
| 5 | LEVEL | enum(4) | 59/171 | Advanced · Beginner  · Beginner  |
| 6 | AVAILABLE SESSION | enum(3) | 158/171 | AM · false · false |
| 7 | (col 7) | enum(2) | 157/171 | PM · false · false |
| 8 | REGISTRATION FEE | enum(2) | 81/171 | false · false · false |
| 9 | INTERESTED in PICKLEBALL MEMBERSHIP? | enum(2) | 7/171 | YES · INTERESTED in PICKLEBALL MEM · YES |
| 10 | (col 10) | boolean? | 4/171 | NO · NO · NO |
| 11 | (col 11) | enum(1) | 4/171 | ALREADY A MEMBER · ALREADY A MEMBER · ALREADY A MEMBER |
| 12 | SIGNATURE | enum(1) | 3/171 | SIGNATURE · SIGNATURE · SIGNATURE |

### PICKLEBALL TALLY SHEET

23 data rows · 12 columns · header on row 3

- Duplicate column names: 9am-11am, 6pm-9pm
- 3 unnamed column(s)
- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | TIME | text | 23/23 | LOCATION · Number of players per time s · Number of players by date |
| 2 | 9am-11am | text | 13/23 | 35 Trần Quý Kiên · 0 · 0329849081 |
| 3 | 9am-11am | text | 14/23 | 35 Trần Quý Kiên · 0 · phoebe.nguyen311@gmail.com |
| 4 | 6pm-9pm | enum(5) | 5/23 | 35 Trần Quý Kiên · 0 · MAR 13, FRI |
| 5 | 9am-11am | enum(5) | 5/23 | 35 Trần Quý Kiên · 0 · MAR 14, SAT |
| 6 | 6pm-9pm | enum(3) | 3/23 | Green Tay Ho · 0 · 6pm-9pm |
| 7 | 9am-12nn | enum(4) | 4/23 | Cove GP · 0 · MAR 15, SUN |
| 8 | 6pm-9pm | integer | 1/23 | 0 |
| 9 | 6pm-8pm | integer | 1/23 | 0 |
| 10 | (col 10) | empty | 0/23 | — |
| 11 | (col 11) | empty | 0/23 | — |
| 12 | (col 12) | empty | 0/23 | — |

### Copy of PICKLEBALL TALLY SHEET

23 data rows · 12 columns · header on row 3

- Duplicate column names: 9am-11am, 6pm-9pm
- 3 unnamed column(s)
- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | TIME | text | 23/23 | LOCATION · Number of players per time s · Number of players by date |
| 2 | 9am-11am | text | 13/23 | 35 Trần Quý Kiên · 0 · 0329849081 |
| 3 | 9am-11am | text | 14/23 | 35 Trần Quý Kiên · 0 · phoebe.nguyen311@gmail.com |
| 4 | 6pm-9pm | enum(5) | 5/23 | 35 Trần Quý Kiên · 0 · MAR 13, FRI |
| 5 | 9am-11am | enum(5) | 5/23 | 35 Trần Quý Kiên · 0 · MAR 14, SAT |
| 6 | 6pm-9pm | enum(3) | 3/23 | Green Tay Ho · 0 · 6pm-9pm |
| 7 | 9am-12nn | enum(4) | 4/23 | Cove GP · 0 · MAR 15, SUN |
| 8 | 6pm-9pm | integer | 1/23 | 0 |
| 9 | 6pm-8pm | integer | 1/23 | 0 |
| 10 | (col 10) | empty | 0/23 | — |
| 11 | (col 11) | empty | 0/23 | — |
| 12 | (col 12) | empty | 0/23 | — |

### VOLUNTEERS

48 data rows · 38 columns

- Duplicate column names: Email Address
- 4 unnamed column(s)
- Personal data: Phone / WhatsApp Number, Email Address, Email Address — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Timestamp | date? | 48/48 | Mon Feb 23 2026 13:02:20 GMT · Sat Feb 28 2026 18:22:21 GMT · Wed Feb 25 2026 21:24:20 GMT |
| 2 | Full Name | text | 48/48 | NGUYỄN MINH PHƯƠNG · KRISTINE JOY GUZMAN · LEILANIE RUIZ |
| 3 | Phone / WhatsApp Number | text | 46/48 | 0329849081 · +84837498195 · +7 775 663 4784 |
| 4 | Email Address | text | 48/48 | phoebe.nguyen311@gmail.com · kristinejoygravador@gmail.co · leilanie080380@gmail.com |
| 5 | Which sport(s) would you like to join ? | enum(4) | 48/48 | Both · Volleyball · Volleyball |
| 6 | Your skill level | text | 45/48 | Beginner (new or learning),  · Beginner (new or learning) · Beginner (new or learning) |
| 7 | Which dates are you available? | text | 48/48 | March 10, March 11, March 12 · March 13, March 14, March 15 · March 14 |
| 8 | MAR 10 | enum(2) | 24/48 | Mon Mar 09 2026 23:59:56 GMT · Volunteer to help (logistics · Mon Mar 09 2026 23:59:56 GMT |
| 9 | MAR 11 | enum(3) | 23/48 | Tue Mar 10 2026 23:59:56 GMT · Tue Mar 10 2026 23:59:56 GMT · Tue Mar 10 2026 23:59:56 GMT |
| 10 | MAR 12 | enum(4) | 22/48 | Wed Mar 11 2026 23:59:56 GMT · Wed Mar 11 2026 23:59:56 GMT · Wed Mar 11 2026 23:59:56 GMT |
| 11 | MAR 13 | enum(4) | 25/48 | Thu Mar 12 2026 23:59:56 GMT · Thu Mar 12 2026 23:59:56 GMT · Thu Mar 12 2026 23:59:56 GMT |
| 12 | MAR 14 | date? | 32/48 | Fri Mar 13 2026 23:59:56 GMT · Fri Mar 13 2026 23:59:56 GMT · Fri Mar 13 2026 23:59:56 GMT |
| 13 | MAR 15 | enum(3) | 30/48 | Sat Mar 14 2026 23:59:56 GMT · Sat Mar 14 2026 23:59:56 GMT · Sat Mar 14 2026 23:59:56 GMT |
| 14 | MAr 16 | text | 23/48 | Sun Mar 15 2026 23:59:56 GMT · Sun Mar 15 2026 23:59:56 GMT · Sun Mar 15 2026 23:59:56 GMT |
| 15 | How Would You Like to Be Involved? | text | 46/48 | Play in clinics or games, Vo · Play in clinics or games, Vo · Play in clinics or games, Vo |
| 16 | Languages you speak | text | 42/48 | Vietnamese, English · English, Filipino · English |
| 17 | How did you hear about this event? | text | 35/48 | Friends · HIF · From our volleyball team lea |
| 18 | Email Address | text | 33/48 | phoebe.nguyen311@gmail.com · kristinejoygravador@gmail.co · leilanie080380@gmail.com |
| 19 | MAR 10 2 | enum(2) | 10/48 | 9am -11am · 9am -11am · 9am -11am |
| 20 | Available Time  [Tuesday-Evening] | enum(2) | 9/48 |  6pm - 9pm · 6pm - 9pm ·  6pm - 9pm |
| 21 | Available Time  [Wednesday-morning] | enum(4) | 7/48 | 9am-2pm, 6pm - 9pm · 9am-2pm, 6pm - 9pm · 9am -11am, 6pm - 9pm |
| 22 | Available Time  [Wednesday-evening] | enum(4) | 14/48 | 9am -11am, 6pm - 9pm · 4pm - 7pm · 9am -11am, 6pm - 9pm |
| 23 | Available Time  [Thursday] | enum(3) | 11/48 | 9am -11am, 6pm - 9pm · 9am -11am · 9am -11am, 6pm - 9pm |
| 24 | Available Time  [Friday-AM] | enum(2) | 9/48 | 9am -11am · 9am -11am · 9am -11am |
| 25 | Available Time  [Friday-PM] | enum(2) | 14/48 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 26 | [Saturday] | enum(3) | 20/48 | 9am -11am · 9am -11am · 9am-2pm |
| 27 | [Saturday] 2 | enum(2) | 18/48 | 1pm - 3pm · 1pm - 3pm · 1pm - 3pm |
| 28 | [Saturday] 3 | enum(2) | 18/48 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 29 | [Sunday] | enum(4) | 21/48 | 4pm - 5:30pm · 4pm - 5:30pm · 4pm - 5:30pm |
| 30 | [Sunday] 2 | enum(4) | 24/48 | 6pm - 9pm · 6pm - 9pm · 6pm - 9pm |
| 31 | Interested Location | enum(2) | 22/48 | Hanoi · Hanoi · Hanoi |
| 32 | Column 1 | empty | 0/48 | — |
| 33 | Column 2 | empty | 0/48 | — |
| 34 | Column 3 | empty | 0/48 | — |
| 35 | (col 35) | empty | 0/48 | — |
| 36 | (col 36) | empty | 0/48 | — |
| 37 | (col 37) | empty | 0/48 | — |
| 38 | (col 38) | empty | 0/48 | — |

### VOLLEYBALL ATTENDANCE-to be pri

51 data rows · 10 columns · header on row 5

- 3 unnamed column(s)
- Personal data: PHONE NUMBER, EMAIL — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | NO. | integer | 50/51 | 1 · 2 · 3 |
| 2 | NAME | text | 10/51 | DARWIN TAMPOS NARCA · KEM CHU · ELLAINE ROSE CAYA |
| 3 | PHONE NUMBER | text | 9/51 | +84 96 8647033 · 0869592755 · 0375901892 |
| 4 | EMAIL | text | 9/51 | darwinnarca10@gmail.com · chuvan2010@gmail.com · cayaellaineroseagui@gmail.co |
| 5 | LEVEL | enum(2) | 10/51 | Beginner  · Beginner  · Beginner  |
| 6 | (col 6) | empty | 0/51 | — |
| 7 | INTERESTED in Volleyball Group? | boolean? | 1/51 | YES |
| 8 | (col 8) | boolean? | 1/51 | NO |
| 9 | (col 9) | enum(1) | 1/51 | Already part the group (zalo |
| 10 | SIGNATURE | empty | 0/51 | — |

### VOLUNTEERS SCHEDULE

22 data rows · 10 columns

- 1 unnamed column(s)
- Personal data: EMAIL — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | GAME | enum(1) | 1/22 | VOLLEYBALL |
| 2 | DATE | date? | 2/22 | Thu Mar 12 2026 23:59:56 GMT · Mar 14-15, 2026 |
| 3 | TIME | empty | 0/22 | — |
| 4 | LOCATION | enum(2) | 2/22 | SMART CITY?? · THANH XUAN |
| 5 | COMMITTEE | text | 17/22 | Leader in-charge · Registration · Communication |
| 6 | TASKS | text | 18/22 | Point person for volleyball  · handles player registration  · sends announcements, schedul |
| 7 | NAME | text | 10/22 | EVERYONE (QR will be generat · MYLENE DOLTEO · ROSALES, ANNA |
| 8 | CONTACT NUMBER | enum(6) | 6/22 | 0357911790 · 0776934404 · 0343427625 |
| 9 | EMAIL | text | 7/22 | annarosales042@gmail.com · jaqidias@gmail.com · kristinejoygravador@gmail.co |
| 10 | (col 10) | empty | 0/22 | — |

### NOT INDICATED

1 data rows · 35 columns

- Duplicate column names: Email Address
- 3 unnamed column(s)
- Personal data: Phone / WhatsApp Number, Email Address, Email Address — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Timestamp | date? | 1/1 | Sun Feb 22 2026 21:50:11 GMT |
| 2 | Full Name | enum(1) | 1/1 | PHAM THI THU THUY |
| 3 | Phone / WhatsApp Number | integer | 1/1 | 0942231891 |
| 4 | Email Address | enum(1) | 1/1 | thuy.phamthithu@itecom.vn |
| 5 | Which sport(s) would you like to join ? | empty | 0/1 | — |
| 6 | Your skill level | enum(1) | 1/1 | Intermediate |
| 7 | Which dates are you available? | enum(1) | 1/1 | March 14, March 15 |
| 8 | MAR 10 | empty | 0/1 | — |
| 9 | MAR 11 | empty | 0/1 | — |
| 10 | MAR 12 | empty | 0/1 | — |
| 11 | MAR 13 | empty | 0/1 | — |
| 12 | MAR 14 | date? | 1/1 | Fri Mar 13 2026 23:59:56 GMT |
| 13 | MAR 15 | date? | 1/1 | Sat Mar 14 2026 23:59:56 GMT |
| 14 | MAr 16 | empty | 0/1 | — |
| 15 | How Would You Like to Be Involved? | enum(1) | 1/1 | Play in clinics or games, Ju |
| 16 | Languages you speak | enum(1) | 1/1 | Vietnamese & English |
| 17 | How did you hear about this event? | enum(1) | 1/1 | Friend |
| 18 | Email Address | enum(1) | 1/1 | thuy.phamthithu@itecom.vn |
| 19 | Available Time  [Tuesday-Morning] | empty | 0/1 | — |
| 20 | Available Time  [Tuesday-Evening] | empty | 0/1 | — |
| 21 | Available Time  [Wednesday-morning] | empty | 0/1 | — |
| 22 | Available Time  [Wednesday-evening] | empty | 0/1 | — |
| 23 | Available Time  [Thursday] | empty | 0/1 | — |
| 24 | Available Time  [Friday-AM] | empty | 0/1 | — |
| 25 | Available Time  [Friday-PM] | empty | 0/1 | — |
| 26 | [Saturday] | enum(1) | 1/1 | 9am -11am |
| 27 | [Saturday] 2 | empty | 0/1 | — |
| 28 | [Saturday] 3 | empty | 0/1 | — |
| 29 | [Sunday] | enum(1) | 1/1 | 4pm - 5:30pm |
| 30 | [Sunday] 2 | empty | 0/1 | — |
| 31 | Interested Location | enum(1) | 1/1 | Hanoi |
| 32 | Column 1 | empty | 0/1 | — |
| 33 | (col 33) | empty | 0/1 | — |
| 34 | (col 34) | empty | 0/1 | — |
| 35 | (col 35) | empty | 0/1 | — |

## 2026-04-03 HIF Monthly Metrics_with Dashboard.xlsx

28 KB · 4 sheet(s): Dashboard, Monthly, Sheet3, Sheet1

### Dashboard

38 data rows · 17 columns · header on row 5

- 10 unnamed column(s)
- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Metric | text | 38/38 | Total Sunday Attendance (all · MyDinh Sunday (wk avg) · Ecopark Sunday (wk avg) |
| 2 | Latest | text | 14/38 | 73 · 73 · 103 |
| 3 | Prev | text | 17/38 | 60 · 49 · 11 |
| 4 | Δ | text | 13/38 | 13 · 24 · 42 |
| 5 | Δ% | text | 15/38 | 0.21666666666666667 · 0.4897959183673469 · 0.6885245901639344 |
| 6 | (col 6) | enum(4) | 4/38 | KidsQuest · 66 · 52 |
| 7 | (col 7) | enum(5) | 6/38 | First Timers · 50 · 89 |
| 8 | (col 8) | enum(6) | 6/38 | New Residents · 40 · 29 |
| 9 | (col 9) | enum(6) | 6/38 | New Resident % · 0.8 · 0.3258426966292135 |
| 10 | (col 10) | enum(4) | 4/38 | Connect Groups · 35 · 28 |
| 11 | (col 11) | enum(3) | 4/38 | Aftershock · 37 · 37 |
| 12 | (col 12) | enum(5) | 7/38 | Membership Req. · 5 · 7 |
| 13 | (col 13) | enum(3) | 4/38 | Foundations · 11 · 9 |
| 14 | (col 14) | enum(3) | 4/38 | Baptisms · 0 · 0 |
| 15 | (col 15) | enum(5) | 5/38 | Total Att. MoM % · -0.12408759124087591 · 0.22152777777777785 |
| 16 | PrevMonth | integer | 6/38 | 33 · 34 · 35 |
| 17 | 46054 | empty | 0/38 | — |

### Monthly

7 data rows · 21 columns · header on row 2

- Name only, no email — matching to PCO people will be unreliable.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Services, Fellowships & Groups | text | 7/7 | Oversight · Tue Sep 30 2025 23:59:56 GMT · Fri Oct 31 2025 23:59:56 GMT |
| 2 | MyDinh Sunday (wk avg) | enum(4) | 4/7 | Marian · 484 · 423 |
| 3 | First Time Guests (Total) | enum(5) | 6/7 | Shilpa · 50 · 89 |
| 4 | KidsQuest (weekly avg) | enum(4) | 4/7 | Marian · 66 · 52 |
| 5 | New Residents (Total out of First Time Guests) | enum(6) | 6/7 | Shilpa · 40 · 29 |
| 6 | Foundations Class (Baptism Prep) | enum(3) | 4/7 | Sara Pyon · 11 · 9 |
| 7 | Baptisms | enum(3) | 4/7 | Shilpa · 0 · 0 |
| 8 | Membership Requests (monthly) | enum(5) | 7/7 | Shilpa · 5 · 7 |
| 9 | Connect Groups (Average Weekly Attendance) | enum(4) | 4/7 | Shilpa · 35 · 28 |
| 10 | Aftershock Youth (weekly avg) | enum(3) | 4/7 | Andrew/ Shilpa · 37 · 37 |
| 11 | Spotlight English Clubs | enum(4) | 4/7 | Michael · ? · 0 |
| 12 | Alpha Course | enum(3) | 6/7 | Jimmy · - · - |
| 13 | African & Int'l Students Fellowship | enum(5) | 5/7 | Tomi · 50 · 80 |
| 14 | Japanese Connect Group | enum(4) | 5/7 | Yorino · 8 · 6 |
| 15 | Korean Fellowship | enum(3) | 3/7 | Ryan · ? · 13 |
| 16 | Myanmar Connect Group | enum(3) | 4/7 | Jah · 5 · 5 |
| 17 | Filippino Fellowship | enum(2) | 2/7 | Marian · ? |
| 18 | Vietnamese Fellowship | enum(4) | 4/7 | Edison · 6 · 8 |
| 19 | Ecopark Sunday | enum(6) | 6/7 | Jonathan · 64 · 57 |
| 20 | Alpha Ecopark | enum(4) | 4/7 | Peter · - · 0 |
| 21 | Thai Nguyen Sunday | enum(4) | 4/7 | Tomi · 14 · 11 |

### Sheet3

1 data rows · 2 columns · header on row 3

- Personal data: https://onedrive.live.com/personal/5fe94b6df62e2b6f/_layouts/15/doc2.aspx?sourcedoc=%7BCE5D1B60-8ADD-4401-A1E8-C969960F779B%7D&file=Headcount_TN-EP.xlsx&action=default&mobileredirect=true — affects where this may be stored
- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Ecopark | empty | 0/1 | — |
| 2 | https://onedrive.live.com/personal/5fe94b6df62e2b6f/_layouts/15/doc2.aspx?sourcedoc=%7BCE5D1B60-8ADD-4401-A1E8-C969960F779B%7D&file=Headcount_TN-EP.xlsx&action=default&mobileredirect=true | enum(1) | 1/1 | https://docs.google.com/spre |

### Sheet1 — empty

## 2026-04-04_Pinoy Family Day Registration Form (Responses) (1) (1).xlsx

13 KB · 1 sheet(s): Form Responses 1

### Form Responses 1

50 data rows · 10 columns

- Name only, no email — matching to PCO people will be unreliable.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Timestamp | date? | 34/50 | Sun Mar 22 2026 18:45:30 GMT · Sun Mar 22 2026 20:49:21 GMT · Sun Mar 22 2026 20:55:23 GMT |
| 2 | Name | text | 49/50 | Ernalyn Fausto · Nathan Fausto · Rane Fausto |
| 3 | Adult or Kids | enum(6) | 49/50 | Adult · Adult · Kids |
| 4 | Contact Number | text | 35/50 | 0938702303 · 0373599171 · 0977959703 |
| 5 | Address in Vietnam | text | 37/50 | Yen Hoa · 28 ngo Dich Vong, Cau Giay,  · Times City |
| 6 | Where are you from the Philippines? (For Groupings) | enum(6) | 40/50 | Visayas · Luzon · Luzon |
| 7 | Are you part of a Connect Group yet? | boolean? | 34/50 | Yes · Yes · Yes |
| 8 | Would you like to us to connect you to a Connect Group nearest you? If your answer is yes, we will contact you. If no, that is okay, we understand it takes time to get comfortable to get to connect with a group. | enum(1) | 6/50 | Yes, I would love that! · Yes, I would love that! · Yes, I would love that! |
| 9 | How would you like to pay? | enum(3) | 35/50 | Pay by cash (On the day) · Pay by cash (On the day) · Pay now via Bank Transfer (  |
| 10 | Payment Received | enum(4) | 7/50 | Received 23/3 · Received 30/3 · Received 30/3 |

## 2026-04-10 All-members.xlsx

30 KB · 2 sheet(s): All-members-2026-04-10, Membership Requests

### All-members-2026-04-10

298 data rows · 8 columns · header on row 3

- 1 unnamed column(s)
- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | 58649332 | integer | 298/298 | 58649342 · 58649344 · 58649353 |
| 2 | Allie Crump | text | 298/298 | Aun Harder · Bernard Wang · Maximo Custodio Cervantes |
| 3 | Allielynette@gmail.com | text | 298/298 | aun@moondata.com · bernardwang@kpmg.com.vn · cervantesmaximo@gmail.com |
| 4 | Hanoi | enum(4) | 293/298 | Hanoi · Hanoi · Hanoi |
| 5 | Member | enum(1) | 298/298 | Member · Member · Member |
| 6 | (col 6) | empty | 0/298 | — |
| 7 | Total All Members: | enum(4) | 4/298 | Total Membership Requests: · Approved Requests (Now Membe · New Member Ratio: |
| 8 | 300 | number | 4/298 | 34 · 18 · 0.06 |

### Membership Requests

34 data rows · 5 columns

- Personal data: Email — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | First Name | text | 34/34 | Raewyn · Silvan · Vu |
| 2 | Last Name | text | 34/34 | Hogarth · Evakise Vevanje · Tran |
| 3 | Email | text | 34/34 | raewynhogarth@icloud.com · silvanvevanje2@gmail.com · rain_holy@hotmail.com |
| 4 | Submitted At | date? | 34/34 | Thu Apr 09 2026 01:50:55 GMT · Sat Mar 28 2026 16:45:56 GMT · Wed Mar 25 2026 16:29:56 GMT |
| 5 | Now Member? | boolean? | 34/34 | No · No · No |

## 2026-04-10 All-volunteers.xlsx

28 KB · 1 sheet(s): ll-volunteers-2026-04-10

### ll-volunteers-2026-04-10

164 data rows · 18 columns

- 1 unnamed column(s)
- Personal data: Primary Email, Primary Phone Number — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Person ID | integer | 164/164 | 58649332 · 58649392 · 58649413 |
| 2 | First name | text | 164/164 | Allie · Jayrbe · Mylene |
| 3 | Last name | text | 164/164 | Crump · Apilan · Dolteo |
| 4 | Primary Email | text | 163/164 | Allielynette@gmail.com · jayrbeapilan@gmail.com · mylenedolteo@gmail.com |
| 5 | Primary Phone Number | text | 158/164 | 0965 963 077 · 0763 162 246 · 0862 007 643 |
| 6 | Primary City | enum(12) | 120/164 | Hanoi · Hanoi · Hanoi |
| 7 | Membership | enum(8) | 163/164 | Member · Member · Member |
| 8 | Custom :: Nationality | text | 159/164 | United States of America · Philippines · Philippines |
| 9 | Campus | enum(4) | 162/164 | Hanoi · Hanoi · Hanoi |
| 10 | Custom :: Volunteer in Ministry (1st) | text | 142/164 | Worship & Media · Connect Groups · Connect Groups |
| 11 | Custom :: Role in Ministry (1st) | enum(11) | 142/164 | Leading Leaders - Coordinato · Leading Leaders - Coordinato · Leading Leaders - Coordinato |
| 12 | Custom :: Volunteer in Ministry (2nd) | text | 53/164 | Service Host · Worship & Media · Worship & Media |
| 13 | Custom :: Role in Ministry (2nd) | text | 50/164 | Leading Self (L1) · Leading Others (L2) - T · Leading Self (L1) - T |
| 14 | Custom :: Volunteer in Ministry (3rd) | text | 13/164 | Prayer Ministry · City Partners · Alpha |
| 15 | Custom :: Role in Ministry (3rd) | enum(5) | 12/164 | Leading Self (L1) · Leading Self (L1) · Leading Others (L2) |
| 16 | (col 16) | empty | 0/164 | — |
| 17 | Level | enum(6) | 6/164 | L1 · L2 · L3 |
| 18 | Total | integer | 6/164 | 39 · 68 · 28 |

## 2026-04-10 Baptism record.xlsx

164 KB · 4 sheet(s): Sheet1, Sheet4, Sheet2, Sheet3

### Sheet1

318 data rows · 9 columns

- Duplicate column names: Nationality
- 1 unnamed column(s)
- Name only, no email — matching to PCO people will be unreliable.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Date | date? | 314/318 | Sat Apr 04 2026 23:59:56 GMT · Sat Apr 04 2026 23:59:56 GMT · Fri Apr 03 2026 23:59:56 GMT |
| 2 | Name | text | 314/318 | Tran Thu 'Trinity' Trang · Vu Phuong Thao · Vu Viet Trung |
| 3 | Nationality | enum(33) | 314/318 | Vietnamese · Vietnamese · Vietnamese |
| 4 | (col 4) | enum(1) | 1/318 | * |
| 5 | Nationality | text | 54/318 | Vietnamese · Chinese · Filipino |
| 6 | Baptisms | text | 55/318 | 90 · 40 · 34 |
| 7 | Column1 | enum(1) | 1/318 | Total: |
| 8 | Aug 2025 - Apr 2026 Summary | enum(5) | 5/318 | Month · Tue Nov 24 2026 23:59:56 GMT · Wed Mar 25 2026 23:59:56 GMT |
| 9 | Column2 | enum(5) | 5/318 | Baptisms · 8 · 7 |

### Sheet4

39 data rows · 6 columns · header on row 2

- 1 unnamed column(s)
- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Sat Sep 16 2023 23:59:56 GMT+0700 (Indochina Time) | date? | 39/39 | Sat Sep 16 2023 23:59:56 GMT · Sat Sep 16 2023 23:59:56 GMT · Sat Sep 09 2023 23:59:56 GMT |
| 2 | Makhosi Shamiso Moriri | text | 39/39 | Nguyen Thu Tien · Lau Thi Si · Calvin Van Rooyen |
| 3 | Eswatini | text | 39/39 | Vietnamese · Vietnamese · South Africa |
| 4 | (col 4) | empty | 0/39 | — |
| 5 | Row Labels | text | 16/39 | American · Canadian · Chinese |
| 6 | Count of Nation | integer | 16/39 | 3 · 1 · 5 |

### Sheet2

25 data rows · 8 columns · header on row 4

- 5 unnamed column(s)
- Name only, no email — matching to PCO people will be unreliable.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Vietnamese | text | 25/25 | South Africa · Vietnamese · Japanese |
| 2 | (col 2) | empty | 0/25 | — |
| 3 | (col 3) | empty | 0/25 | — |
| 4 | (col 4) | empty | 0/25 | — |
| 5 | (col 5) | empty | 0/25 | — |
| 6 | (col 6) | empty | 0/25 | — |
| 7 | Row Labels | text | 15/25 | American · Canadian · Chinese |
| 8 | Count of Nationality | integer | 15/25 | 1 · 1 · 5 |

### Sheet3 — empty

## 2026-04-10 membership_requests_table.xlsx

17 KB · 2 sheet(s): Membership Requests, Notes

### Membership Requests

35 data rows · 22 columns

- Personal data: Email, Phone number — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | First Name | text | 35/35 | Raewyn · Silvan · Vu |
| 2 | Last Name | text | 35/35 | Hogarth · Evakise Vevanje · Tran |
| 3 | Email | text | 35/35 | raewynhogarth@icloud.com · silvanvevanje2@gmail.com · rain_holy@hotmail.com |
| 4 | Submitted At | date? | 35/35 | Thu Apr 09 2026 01:50:55 GMT · Sat Mar 28 2026 16:45:56 GMT · Wed Mar 25 2026 16:29:56 GMT |
| 5 | Phone number | text | 35/35 | Mobile: 9 862 4430 · Mobile: 0387 788 410 · Mobile: 0867 785 880 |
| 6 | Have you been baptized? | boolean? | 35/35 | Yes · Yes · Yes |
| 7 | If not, are you interested in baptism? | enum(1) | 1/35 | I am interested in learning  |
| 8 | Please confirm your baptism status: | enum(3) | 35/35 | I have been baptized as an a · I have been baptized as an a · I have been baptized as an a |
| 9 | Country in which you were baptized | text | 33/35 | New zealand · Cameroon · US |
| 10 | Year you were baptized | text | 33/35 | 1990 · 2017 · 2010 |
| 11 | What is the name of church/organization/group that baptized you? | text | 31/35 | Lincoln Baptist Church · Word For Life Ministry Limbe · Church of Christ |
| 12 | In the past, have you ever been involved and served in a church ministry? | boolean? | 34/35 | Yes · Yes · Yes |
| 13 | If so, briefly describe the ministry or ministries you were involved in. | text | 22/35 | Worship, Prayer, Youth. Miss · I was the chief Protocol and · Leadership in Single ministr |
| 14 | Do you attend HIF worship services online or in person? | enum(3) | 35/35 | A mix of in person and onlin · In person regularly · In person regularly |
| 15 | I have filled the HIF People Form | boolean? | 35/35 | Yes · Yes · Yes |
| 16 | I primarily attend: | empty | 0/35 | — |
| 17 | I have read and affirm the HIF Statement of Faith | boolean? | 35/35 | Yes · Yes · Yes |
| 18 | I have read and agree to follow the HIF Constitution | boolean? | 35/35 | Yes · Yes · Yes |
| 19 | I agree to active participation (including regular in-person attendance of Sunday worship services) and spiritual growth in the body of Christ | boolean? | 35/35 | Yes · Yes · Yes |
| 20 | Comment | enum(3) | 3/35 | Thank you ❤ · I have selected "In person r · Do the church have chat grou |
| 21 | Confirmation | empty | 0/35 | — |
| 22 | Source Provided | enum(2) | 35/35 | Uploaded file · Uploaded file · Uploaded file |

### Notes

3 data rows · 2 columns · header on row 2

- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Rows included: | enum(3) | 3/3 | Sorted: · Sources combined: · Parser note: |
| 2 | 35 | enum(3) | 3/3 | Newest to oldest by Submitte · Chat paste + uploaded text f · Blank fields were left empty |

## 2026-04-19 AFRICAN FELLOWSHIP  attendance List April and March.csv

3 KB · 1 sheet(s): Sheet1

### Sheet1

73 data rows · 7 columns

- **Wide format**: 2 columns are dates (22/3/2026, 19/4/2026…). One column per event — needs unpivoting into rows before import.
- Name only, no email — matching to PCO people will be unreliable.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | first name | text | 73/73 | Oluwatomisin · Kingsley · Oluwatobi |
| 2 | last name | text | 73/73 | Ogunbawo · Effiong · Adeyinka |
| 3 | percent | enum(4) | 73/73 | 1 · 1 · 0 |
| 4 | events attended | integer | 73/73 | 2 · 2 · 0 |
| 5 | events | integer | 73/73 | 2 · 2 · 2 |
| 6 | 22/3/2026 | enum(3) | 35/73 | attended as leader · attended as member · attended as member |
| 7 | 19/4/2026 | enum(3) | 34/73 | attended as leader · attended as member · attended as member |

## 2026-04-21 - Membership Signup Updated Status.xlsx

18 KB · 1 sheet(s): Sheet1

### Sheet1

21 data rows · 13 columns

- 1 unnamed column(s)
- Personal data: Email — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Sl | integer | 21/21 | 1 · 2 · 3 |
| 2 | Status | enum(4) | 21/21 | Approved · Rejected · Pending |
| 3 | First Name | text | 21/21 | Peter  · Dewa  · John |
| 4 | Last Name | text | 21/21 | Amoako · Putu Teguh Tresnahadi ·  Paul Egtapen |
| 5 | Email | text | 21/21 | peteramoako1212@gmail.com · tresnahadi69@gmail.com
 · johnthailand2013@gmail.com |
| 6 | Signup time | date? | 21/21 | Tue Dec 02 2025 23:59:56 GMT · Mon Dec 22 2025 23:59:56 GMT · Thu Dec 25 2025 23:59:56 GMT |
| 7 | Contact | text | 21/21 | 0584 902 798 · 62 812-3670-4646 · 0858 645 136 |
| 8 | Gender | enum(2) | 21/21 | Male · Male · Male |
| 9 | Country | text | 21/21 | Nigeria · Indonesia · Philippines |
| 10 | Campus | enum(3) | 20/21 | Hanoi · Online · Hanoi |
| 11 | Shilpa - Comments | text | 20/21 | under observation for some t · As per membership form - is  · Tomi was to meet him on 9th  |
| 12 | Response From Kester / Elders | text | 15/21 | Approved · Rejected · Stanley spke to her and Shil |
| 13 | (col 13) | enum(1) | 1/21 | Wait till Baptism is done. |

## 2026-04-22 Raw Data for March from PCO (Shilpa).xlsx

28 KB · 6 sheet(s): New Comers March, Aftershock, All Groups& Fellowship, Connect Groups only, Ecopark- Sunday, African Fellowship

### New Comers March

103 data rows · 14 columns

- 1 unnamed column(s)
- Personal data: Primary Email, Primary Phone Number — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Person ID | integer | 103/103 | 116639104 · 134330041 · 188339992 |
| 2 | Name | text | 103/103 | Lan Nhung Bui · Phuong Thanh Le · thanh Háº£i Nguyá»…n thá»‹ |
| 3 | Primary Email | text | 91/103 | nhungnhung.emmanuel@gmail.co · lethi.phuongthanh.apu@gmail. · haithanh1902@gmail.com |
| 4 | Primary Phone Number | text | 95/103 | 0376 707 706 · 0938 252 215 · 0968 648 836 |
| 5 | First name | text | 103/103 | Lan Nhung · Phuong Thanh · thanh Háº£i |
| 6 | Middle name | empty | 0/103 | — |
| 7 | Last name | text | 103/103 | Bui · Le · Nguyá»…n thá»‹ |
| 8 | Gender | enum(2) | 103/103 | Female · Female · Female |
| 9 | Campus | enum(3) | 103/103 | Hanoi · Hanoi · Hanoi |
| 10 | Grade | empty | 0/103 | — |
| 11 | Membership | enum(5) | 103/103 | In Progress · Visitor · Local |
| 12 | Status | enum(1) | 103/103 | active · active · active |
| 13 | Profile Created On | text | 103/103 | 26/10/2022, 11:53 · 12/9/2023, 11:32 · 1/3/2026, 10:32 |
| 14 | (col 14) | empty | 0/103 | — |

### Aftershock

5 data rows · 3 columns · header on row 2

- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Week1 | enum(5) | 5/5 | Week2 · Week3 · Week4 |
| 2 | 6th March | enum(4) | 4/5 | 13th March · 20th March · 27th Mar |
| 3 | 40 | integer | 4/5 | 35 · 0 · 27 |

### All Groups& Fellowship

31 data rows · 9 columns

- 1 unnamed column(s)
- Name only, no email — matching to PCO people will be unreliable.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Group name | text | 30/31 | Pinoy Westlake Afternoon Gro · Pinoy Westlake Afternoon Gro · Pinoy Westlake Afternoon Gro |
| 2 | Group type | enum(2) | 30/31 | Connect Groups · Connect Groups · Connect Groups |
| 3 | Leaders | text | 30/31 | Jayrbe Apilan [jayrbeapilan@ · Jayrbe Apilan [jayrbeapilan@ · Jayrbe Apilan [jayrbeapilan@ |
| 4 | Members count | integer | 30/31 | 21 · 21 · 21 |
| 5 | Event name | text | 30/31 | Meets weekly on Sundays from · Meets weekly on Sundays from · Meets weekly on Sundays from |
| 6 | Total attended count | number | 31/31 | 11 · 8 · 10 |
| 7 | Members attended count | integer | 30/31 | 11 · 8 · 10 |
| 8 | Visitors attended count | integer | 30/31 | 0 · 0 · 0 |
| 9 | (col 9) | empty | 0/31 | — |

### Connect Groups only

15 data rows · 8 columns · header on row 2

- 1 unnamed column(s)
- Name only, no email — matching to PCO people will be unreliable.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Group name | enum(5) | 15/15 | Pinoy Westlake Afternoon Gro · Pinoy Westlake Afternoon Gro · Thursday - Young Adults Bibl |
| 2 | Group type | enum(1) | 15/15 | Connect Groups · Connect Groups · Connect Groups |
| 3 | Members count | integer | 15/15 | 21 · 21 · 5 |
| 4 | Event name | enum(5) | 15/15 | Meets weekly on Sundays from · Meets weekly on Sundays from · Regular Meeting |
| 5 | Total attended count | integer | 15/15 | 8 · 10 · 7 |
| 6 | Members attended count | integer | 15/15 | 8 · 10 · 3 |
| 7 | Visitors attended count | integer | 15/15 | 0 · 0 · 4 |
| 8 | (col 8) | empty | 0/15 | — |

### Ecopark- Sunday

6 data rows · 26 columns

- 21 unnamed column(s)
- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | SUNDAY | date? | 5/6 | Sat Feb 28 2026 23:59:56 GMT · Sat Mar 07 2026 23:59:56 GMT · Sat Mar 14 2026 23:59:56 GMT |
| 2 | ADULTS | integer | 5/6 | 59 · 54 · 53 |
| 3 | Teens | integer | 5/6 | 4 · 6 · 5 |
| 4 | KIDS | enum(4) | 6/6 | 10 · 10 · 11 |
| 5 | TOTAL | integer | 6/6 | 73 · 70 · 69 |
| 6 | (col 6) | empty | 0/6 | — |
| 7 | (col 7) | empty | 0/6 | — |
| 8 | (col 8) | empty | 0/6 | — |
| 9 | (col 9) | empty | 0/6 | — |
| 10 | (col 10) | empty | 0/6 | — |
| 11 | (col 11) | empty | 0/6 | — |
| 12 | (col 12) | empty | 0/6 | — |
| 13 | (col 13) | empty | 0/6 | — |
| 14 | (col 14) | empty | 0/6 | — |
| 15 | (col 15) | empty | 0/6 | — |
| 16 | (col 16) | empty | 0/6 | — |
| 17 | (col 17) | empty | 0/6 | — |
| 18 | (col 18) | empty | 0/6 | — |
| 19 | (col 19) | empty | 0/6 | — |
| 20 | (col 20) | empty | 0/6 | — |
| 21 | (col 21) | empty | 0/6 | — |
| 22 | (col 22) | empty | 0/6 | — |
| 23 | (col 23) | empty | 0/6 | — |
| 24 | (col 24) | empty | 0/6 | — |
| 25 | (col 25) | empty | 0/6 | — |
| 26 | (col 26) | empty | 0/6 | — |

### African Fellowship

1 data rows · 1 columns

- No obvious person identifier.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | African Fellowship is stopped due to Administration reasons | enum(1) | 1/1 | Not Applicable  |

## 2026-08-13 - Membership Signup Updated Status.xlsx

23 KB · 1 sheet(s): Sheet1

### Sheet1

59 data rows · 14 columns

- 1 unnamed column(s)
- Personal data: Email — affects where this may be stored
- Has an email column — can be matched to PCO people.

| # | Column | Type | Filled | Sample |
|---:|---|---|---:|---|
| 1 | Sl | integer | 59/59 | 1 · 2 · 3 |
| 2 | Status | enum(4) | 55/59 | Approved · Rejected · Rejected |
| 3 | First Name | text | 53/59 | Peter  · Dewa  · John |
| 4 | Last Name | text | 53/59 | Amoako · Putu Teguh Tresnahadi ·  Paul Egtapen |
| 5 | Email | text | 53/59 | peteramoako1212@gmail.com · tresnahadi69@gmail.com
 · johnthailand2013@gmail.com |
| 6 | Signup time | text | 51/59 | Tue Dec 02 2025 23:59:56 GMT · Mon Dec 22 2025 23:59:56 GMT · Thu Dec 25 2025 23:59:56 GMT |
| 7 | Contact | text | 53/59 | 0584 902 798 · 62 812-3670-4646 · 0858 645 136 |
| 8 | Gender | enum(2) | 53/59 | Male · Male · Male |
| 9 | Country | text | 52/59 | Nigeria · Indonesia · Philippines |
| 10 | Campus | enum(4) | 52/59 | Hanoi · Online · Hanoi |
| 11 | Shilpa - Comments | text | 50/59 | under observation for some t · As per membership form - is  · Tomi was to meet him on 9th  |
| 12 | Interviewed By | enum(1) | 1/59 | Stanley |
| 13 | Response From Kester / Elders | text | 43/59 | Approved · Rejected · Rejected - Update from Keste |
| 14 | (col 14) | enum(2) | 26/59 | elders updated · elders updated · elders updated |
