# Langr
Language Guessing Game

Play the game at the [Langr Game Site](https://raymondtana.github.io/projects/pages/Langr.html)!

This repository houses the code for a language guessing game. The concept of the game is similar to the Wordle variants, and is unique in its multimodality. Language samples are provided, and the user is meant to use the available evidence to guess the source language from which all that evidence comes. The user receives a better score for using less evidence.

## Data
We make use of many sources of data in order to create this game. 

Spoken samples, sentence text, and other speaker metadata are sourced from `Mozilla CommonVoice`. And language metadata was mainly sourced from `Glottolog`, including a language's family lineage. The `langcodes` library helps to translate between each library using standard ISO 639‑3 codes. 

## Work in Progress
Please alert us of any inconsistencies or additional languages you'd like to suggest we include. It takes time to incorporate a new language, especially if we wish to programmaticaly source it using spoken examples from existing libraries. 
