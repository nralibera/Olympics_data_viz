# About Dataset : [Olympic Historical Dataset From Olympedia.org](https://www.kaggle.com/datasets/josephcheng123456/olympic-historical-dataset-from-olympediaorg)

## Context

This dataset is as an attempt to create up to date Olympic Event datasets (from 1986 to 2022 Olympics Game) for any sports/data enthusiast to use to visualise and create some insights on the Olympic Event dataset.

## Unique Feature of the Dataset

- This dataset contains ranking of each sporting event linked to speicfic country / athlete, which could be used to for any performance related analytics
- This dataset contains string information about the athlete's Bio, which could be useful in understanding more about the athlete

## Basic Dataset Information
This dataset contains:

- 154,902 unique athletes and their biological information i.e. height, weight, date of birth
- All Winter / Summer Olympic games from 1896 to 2022
- 7326 unique results (result for a specific event played at an Olympic game)
- 314,726 rows of athlete to result data which includes both team sports and individual sports
    - each row includes position - which is how well the athlete performed for the specific event (Ranked)
        - Note: not all position is integer - contains strings which contains information on which round / heat they achieved
- 235 distinct countries (some existing from the past)

## How to Use the Dataset for a complete athlete-event dataset
- Olympic_Athlete_Event_Results.csv - Contains basic athlete to result data (including athlete_id and result_id)
- LEFT JOIN Olympic_Athlete_Event_Results.csv file with Olympic_Athlete_Bio.csv (on athlete_id) for complete information of the athlete (i.e. height, weight, date of birth when participating in the event)
- LEFT JOIN Olympic_Athlete_Event_Results.csv with Olympic_Results.csv (on result_id) to obtain detailed information about the result (i.e. start date, sport, result_participants, format, time
- Aggregate information to obtain features such as:
  - BMI - from height and weight
  - Age of participation - start date of the result subtract the date of birth of the athlete
- TODO: Create a Kernal to demonstrate how above step works

## Where the Data is Obtained
The data is scrapped from www.olympedia.org which has the latest up to date olympic data set from 1896 Athene Summer Olympics to Beijing 2022 Winter Olympics. Web Scrapping Project is provided via the source code in github using Python's BeautifulSoup.

## Entity Relationship Table - Schema
![Alt text](image.png)