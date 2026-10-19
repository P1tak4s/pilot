# Quotes set: 150 more (plan, nothing built yet)

The quotes set has 50 quill-written cards (0.12.0). This plan takes it to 200.

## 1. How to ship 200

Today every quote is its own SVG file of 20 to 30 KB. The plugin reads every scene file of every set into memory when
a session starts (`loadBuiltIn` in `plugin/hooks/register.tsx`), so the format matters at this size.

| | Files, as now | Template |
|---|---|---|
| What ships | 200 SVG files | 50 files stay, or none; one quote list and one renderer |
| Plugin size for quotes | about 5 MB | about 150 KB |
| Read at every session start | 5 MB | the list only |
| Work | add 150 lines to `art-src/quotes.py`, run it | port `card()` from `quotes.py` to a pure TS module (no `$`), plus a width table for Georgia italic, then wire it into the set list |
| Risk | none new, the format is proven | the renderer must lay out exactly like the Python one; tests cover it |

**Recommendation: the template.** 5 MB read on every start is a real cost for a card people glance at, and the next
150 after these would make it worse. The art stays identical: same quill, same writing, same layout rules.

Template plan, if picked:
1. `plugin/hooks/quill.ts`: `card(text, author)` returning the same SVG as `quotes.py` does today. Pure, no `$`, like
   `chess-rules.ts`. Letter widths come from a table measured once from `georgiai.ttf` with PIL.
2. `plugin/hooks/quotes.ts`: the 200 quotes as `[id, text, author]`.
3. `loadBuiltIn` adds the quotes set from that list instead of from files; `/textless set quotes` and the picker work
   unchanged. The 50 files go.
4. Tests (`quotes.test.ts`): every quote fits four lines at size 24 or more; ids are unique; every card is under the
   SVG cap; for five sample quotes the TS output matches `quotes.py` line breaks and size.
5. Note for the settings page: own sets ("mixes") hold at most 60 scenes, so a mix cannot take all 200 quotes.

## 2. Rules for picking

- Writers who died long ago, so the words are out of copyright. Nobody alive, nobody who died after about 1955.
- Short: one card, at most four lines at size 24 or more (about 110 characters).
- No duplicates of the 50 already shipped.
- Well-known lines. Some are traditional attributions rather than proven exact wording, like on most quote sites;
  those are marked *(attributed)*. Lines widely known to be misattributed are left out.
- A mix of moods: about 40% inspiring, 20% philosophical, 15% funny, 15% wholesome, 10% craft and patience.

## 3. The 150, by group

### Leaders and warriors (20)
1. The die is cast. - Julius Caesar
2. Men willingly believe what they wish. - Julius Caesar
3. A leader is a dealer in hope. - Napoleon Bonaparte
4. Victory belongs to the most persevering. - Napoleon Bonaparte
5. Ten people who speak make more noise than ten thousand who are silent. - Napoleon Bonaparte
6. Toil and risk are the price of glory. - Alexander the Great *(attributed)*
7. Upon the conduct of each depends the fate of all. - Alexander the Great
8. The supreme art of war is to subdue the enemy without fighting. - Sun Tzu
9. Opportunities multiply as they are seized. - Sun Tzu
10. There is no instance of a nation benefitting from prolonged warfare. - Sun Tzu
11. If you want peace, prepare for war. - Vegetius
12. I am a slow walker, but I never walk back. - Abraham Lincoln *(attributed)*
13. Speak softly and carry a big stick. - Theodore Roosevelt
14. Do what you can, with what you have, where you are. - Theodore Roosevelt
15. Believe you can and you're halfway there. - Theodore Roosevelt
16. I would rather die on my feet than live on my knees. - Emiliano Zapata *(attributed)*
17. I have the heart and stomach of a king. - Elizabeth I
18. He who defends everything defends nothing. - Frederick the Great
19. I propose to fight it out on this line if it takes all summer. - Ulysses S. Grant
20. I am not afraid; I was born to do this. - Joan of Arc

### Ancient philosophy (25)
21. Know thyself. - Temple of Apollo at Delphi
22. I know that I know nothing. - Socrates
23. Wonder is the beginning of wisdom. - Socrates
24. The beginning of wisdom is the definition of terms. - Socrates *(attributed)*
25. Courage is knowing what not to fear. - Plato
26. Wise men speak because they have something to say; fools because they have to say something. - Plato *(attributed)*
27. The roots of education are bitter, but the fruit is sweet. - Aristotle
28. It is the mark of an educated mind to entertain a thought without accepting it. - Aristotle *(attributed)*
29. Happiness depends upon ourselves. - Aristotle
30. Character is destiny. - Heraclitus
31. Much learning does not teach understanding. - Heraclitus
32. He who knows others is wise; he who knows himself is enlightened. - Lao Tzu
33. Nature does not hurry, yet everything is accomplished. - Lao Tzu
34. When I let go of what I am, I become what I might be. - Lao Tzu *(attributed)*
35. Real knowledge is to know the extent of one's ignorance. - Confucius
36. Our greatest glory is not in never falling, but in rising every time we fall. - Confucius *(attributed)*
37. The man who moves a mountain begins by carrying away small stones. - Confucius *(attributed)*
38. Everything has beauty, but not everyone sees it. - Confucius
39. Not what we have but what we enjoy constitutes our abundance. - Epicurus
40. Do not spoil what you have by desiring what you have not. - Epicurus
41. The greater the difficulty, the more glory in surmounting it. - Epicurus
42. Man is the measure of all things. - Protagoras
43. Time is the wisest counsellor of all. - Pericles
44. The secret of happiness is freedom, and the secret of freedom is courage. - Thucydides
45. The mind is not a vessel to be filled, but a fire to be kindled. - Plutarch

### Stoics (15)
46. No man is free who is not master of himself. - Epictetus
47. Wealth consists not in having great possessions, but in having few wants. - Epictetus
48. Only the educated are free. - Epictetus
49. We have two ears and one mouth so that we can listen twice as much as we speak. - Epictetus
50. Waste no more time arguing about what a good man should be. Be one. - Marcus Aurelius
51. Very little is needed to make a happy life. - Marcus Aurelius
52. The best revenge is not to be like your enemy. - Marcus Aurelius
53. Loss is nothing else but change, and change is Nature's delight. - Marcus Aurelius
54. If it is not right, do not do it; if it is not true, do not say it. - Marcus Aurelius
55. While we wait for life, life passes. - Seneca
56. Difficulties strengthen the mind, as labour does the body. - Seneca
57. It is not that we have a short time to live, but that we waste a lot of it. - Seneca
58. Every new beginning comes from some other beginning's end. - Seneca
59. He who is brave is free. - Seneca
60. Begin at once to live. - Seneca

### Science and invention (15)
61. Fortune favours the prepared mind. - Louis Pasteur
62. Nothing in life is to be feared, it is only to be understood. - Marie Curie
63. Be less curious about people and more curious about ideas. - Marie Curie
64. Genius is one percent inspiration and ninety-nine percent perspiration. - Thomas Edison
65. Imagination is more important than knowledge. - Albert Einstein
66. The important thing is not to stop questioning. - Albert Einstein
67. Nature is pleased with simplicity. - Isaac Newton
68. Measure what is measurable, and make measurable what is not so. - Galileo Galilei *(attributed)*
69. All truths are easy to understand once they are discovered. - Galileo Galilei
70. Art is never finished, only abandoned. - Leonardo da Vinci *(attributed)*
71. The noblest pleasure is the joy of understanding. - Leonardo da Vinci
72. A man who dares to waste one hour of time has not discovered the value of life. - Charles Darwin
73. The present is theirs; the future, for which I really worked, is mine. - Nikola Tesla
74. Eureka! - Archimedes
75. Science is organized knowledge. Wisdom is organized life. - Immanuel Kant *(attributed)*

### Writers and poets (25)
76. Fortune favours the bold. - Virgil
77. Love conquers all. - Virgil
78. Seize the day. - Horace
79. To err is human, to forgive divine. - Alexander Pope
80. Hope springs eternal in the human breast. - Alexander Pope
81. All that glitters is not gold. - William Shakespeare
82. The course of true love never did run smooth. - William Shakespeare
83. Some are born great, some achieve greatness, and some have greatness thrust upon them. - William Shakespeare
84. This above all: to thine own self be true. - William Shakespeare
85. It was the best of times, it was the worst of times. - Charles Dickens
86. Hope is the thing with feathers. - Emily Dickinson
87. Forever is composed of nows. - Emily Dickinson
88. I took the one less traveled by, and that has made all the difference. - Robert Frost
89. 'Tis better to have loved and lost than never to have loved at all. - Alfred Tennyson
90. To strive, to seek, to find, and not to yield. - Alfred Tennyson
91. A thing of beauty is a joy for ever. - John Keats
92. Beauty is truth, truth beauty. - John Keats
93. The pen is mightier than the sword. - Edward Bulwer-Lytton
94. Whatever our souls are made of, his and mine are the same. - Emily Brontë
95. I am no bird; and no net ensnares me. - Charlotte Brontë
96. Happy families are all alike; every unhappy family is unhappy in its own way. - Leo Tolstoy
97. Beauty will save the world. - Fyodor Dostoevsky
98. A room without books is like a body without a soul. - Cicero *(attributed)*
99. If you have a garden and a library, you have everything you need. - Cicero
100. Do I dare disturb the universe? - T. S. Eliot

### Funny and witty (20)
101. I am so clever that sometimes I don't understand a single word of what I am saying. - Oscar Wilde
102. To love oneself is the beginning of a lifelong romance. - Oscar Wilde
103. The only thing to do with good advice is to pass it on. - Oscar Wilde
104. Work is the curse of the drinking classes. - Oscar Wilde
105. I am not young enough to know everything. - Oscar Wilde
106. There are only two tragedies in life: one is not getting what one wants, and the other is getting it. - Oscar Wilde
107. Get your facts first, then you can distort them as you please. - Mark Twain
108. The report of my death was an exaggeration. - Mark Twain
109. Clothes make the man. Naked people have little or no influence on society. - Mark Twain
110. If you tell the truth, you don't have to remember anything. - Mark Twain
111. Be careful about reading health books. You may die of a misprint. - Mark Twain
112. Common sense is not so common. - Voltaire
113. The secret of being a bore is to tell everything. - Voltaire
114. Let us read, and let us dance; these two amusements will never do any harm to the world. - Voltaire
115. Early to bed and early to rise makes a man healthy, wealthy, and wise. - Benjamin Franklin
116. Fish and visitors stink after three days. - Benjamin Franklin
117. In this world nothing can be said to be certain, except death and taxes. - Benjamin Franklin
118. Do not take life too seriously. You will never get out of it alive. - Elbert Hubbard
119. Diplomacy is the art of saying "nice doggie" until you can find a rock. - Will Rogers
120. I never travel without my diary. One should always have something sensational to read in the train. - Oscar Wilde

### Wholesome and kind (15)
121. Be kind, for everyone you meet is fighting a hard battle. - Ian Maclaren
122. The best and most beautiful things in the world must be felt with the heart. - Helen Keller
123. Alone we can do so little; together we can do so much. - Helen Keller
124. Keep your face to the sunshine and you cannot see a shadow. - Helen Keller
125. What we do for ourselves dies with us. What we do for others remains. - Albert Pike
126. Wherever there is a human being, there is an opportunity for a kindness. - Seneca
127. Friendship is a single soul dwelling in two bodies. - Aristotle
128. A friend is someone who knows all about you and still loves you. - Elbert Hubbard
129. Kindness in words creates confidence. - Lao Tzu
130. Let us be grateful to the people who make us happy; they are the charming gardeners who make our souls blossom. - Marcel Proust
131. Gratitude is not only the greatest of virtues, but the parent of all the others. - Cicero
132. Love all, trust a few, do wrong to none. - William Shakespeare
133. Where there is love there is life. - Mahatma Gandhi
134. Love is patient, love is kind. - 1 Corinthians 13:4
135. Wherever you go, go with all your heart. - Confucius

### Craft and patience (15)
136. Give me six hours to chop down a tree and I will spend the first four sharpening the axe. - Abraham Lincoln *(attributed)*
137. Rome was not built in a day. - John Heywood
138. Patience is bitter, but its fruit is sweet. - Jean-Jacques Rousseau
139. One today is worth two tomorrows. - Benjamin Franklin
140. Pleasure in the job puts perfection in the work. - Aristotle
141. Energy and persistence conquer all things. - Benjamin Franklin
142. Do not wait to strike till the iron is hot; but make it hot by striking. - William Butler Yeats
143. Little strokes fell great oaks. - Benjamin Franklin
144. Slow and steady wins the race. - Aesop
145. Practice is everything. - Periander
146. Make haste slowly. - Augustus
147. Measure twice, cut once. - Old proverb
148. He who has begun is half done; dare to be wise. - Horace
149. Great things are done by a series of small things brought together. - Vincent van Gogh
150. I am always doing that which I cannot do, in order that I may learn how to do it. - Vincent van Gogh

## 4. Before building

- Isac strikes or swaps lines in the list above.
- Checked already: all 150 fit four lines at size 24 or more with the current layout, and none repeats a shipped quote.
- Then build, check all 200 in the browser preview, and show them on the canvas in batches of 30 for a last look.

## 5. Done in 0.13.0, and what the website still needs

Built as the template: `plugin/hooks/quill.ts` draws each quote from `plugin/hooks/quotes-list.ts` when shown;
`plugin/hooks/scenes/quotes/` is gone. The first 50 ids are unchanged, so own sets saying `quotes/<id>` still work.
A quote is written once: after the seconds in its root `data-once` attribute the card shows a still copy.

**Website / settings page (not done yet):** it builds own sets from preview files, so it needs all 200 quotes as
files. Make them from master with:

    node --experimental-strip-types --no-warnings scripts/quote-previews.mjs site/assets/scenes/quotes

Replace any older quote files there (the 0.12.0 copies); ids for the first 50 match.
