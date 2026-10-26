# ufabc-urbana

O UFABC Urbana é uma plataforma de comunicação científica sobre **ilhas de calor urbanas e o papel da vegetação no microclima das cidades**. É um projeto da disciplina *Projeto Dirigido* do Bacharelado em Ciência e Tecnologia da UFABC.

## O que é o UFABC Urbana

Um mapa interativo na web que ajuda um público não especialista a explorar como a forma como as cidades são construídas se relaciona com a temperatura local. A pessoa seleciona uma área, consulta os indicadores realmente disponíveis para ela (temperatura, cobertura vegetal, área construída, densidade demográfica), entende por que esses indicadores importam e acessa as fontes científicas relacionadas.

- **Pergunta de pesquisa principal:** como as características da urbanização influenciam a temperatura de diferentes áreas de uma cidade?
- **Pergunta de pesquisa secundária:** qual é a relação entre a cobertura vegetal e a temperatura urbana?
- **Área de estudo:** o município de São Paulo (o pipeline foi pensado para se expandir depois para a Região Metropolitana de São Paulo).

A plataforma serve para exploração e comunicação, não para apresentar afirmações causais sem comprovação nem medições inventadas. Cada indicador mostra sua fonte, período, unidade e tipo de dado (observado, derivado ou simulado).

## Como começar

Requisitos: Node.js >= 24, pnpm e uv

```sh
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm check-types
```
