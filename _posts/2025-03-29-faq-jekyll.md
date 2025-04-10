---
title: FAQ (Frequently Asked Questions) Jekyll - часто задаваемые вопросы
date: 2025-03-29 22:58:00 +0300  # Московское время (UTC+3)
categories: [Jekyll, FAQ]
tags: [Jekyll, FAQ]     # TAG names should always be lowercase
# description: Следующий пункт назначения используется несколькими файлами совместно.
---

## Как отложить публикацию поста?


Добавьте пост в черновик. В Jekyll есть [черновики](https://jekyllrb.com/docs/posts/#drafts) для постов. 
Добавьте в корень проекта директорию `_darfts/` и храните в ней посты над которыми работаете. 


### Черновики в Jekyll

**Что это?**  
[Черновики](https://jekyllrb.com/docs/posts/#drafts) — это посты без даты в названии файла. Они не публикуются 
автоматически, пока вы не перенесёте их в `_posts` с указанием даты.

**Как использовать?**
1. Создайте папку `_drafts` в корне сайта.
2. Добавьте файл без даты (например,`my-draft.md`).
3. Для локального просмотра запустите:
   ```sh
   jekyll serve --drafts
   ```  
4. Когда пост готов, переместите его в `_posts` с датой в имени (например, `2024-03-30-my-post.md`).

