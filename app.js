// the map
const width = window.innerWidth*0.7;
const height = window.innerHeight*0.85;

const rootSvg = d3.select('.map')    
              .append('svg')
              .attr('class', 'rootSvg')
              .attr('width', width)
              .attr('height', height);

       
const svg = d3.select('.rootSvg')
    .append('svg')
    .attr('class' , 'svg')
    .attr('width', width)
    .attr('height', height*0.8);

// Group for the map
const g = svg.append('g');

    
// SVG for the graph
const graph = rootSvg.append('svg')
                  .attr('class' , 'graph')
                  .attr('x', width*0.1)
                  .attr('y', height*0.75);
 
 // Projection
const projection = d3.geoMercator().scale(150).translate([width / 2, height / 1.5]);
const pathGenerator = d3.geoPath(projection);

// Zoom
rootSvg.call(d3.zoom().on('zoom',()=>{
    g.attr("transform", d3.event.transform);
    }));

// Pattern Creation for Background

const pattern = svg.append('defs')
  .append('pattern')
    .attr('id', 'greyDots')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 4)
    .attr('height', 4);

pattern.append('circle')
  .attr('cx', 2)
  .attr('cy', 2)
  .attr('r', 1.3)
  .attr('fill', 'rgba(189, 195, 199, 1)');

const redPattern = svg.append('defs')
.append('pattern')
  .attr('id', 'redDots')
  .attr('patternUnits', 'userSpaceOnUse')
  .attr('width', 4)
  .attr('height', 4);

  redPattern.append('circle')
.attr('cx', 2)
.attr('cy', 2)
.attr('r', 1.3)
.attr('fill', 'red');

// Function to get the athlete name from the id
function getAthleteInfoFromId(athleteId, jsonData){
    let athleteInfo = jsonData[athleteId.toString()];
    return athleteInfo['athlete_name']
}

// Function to build the path of an athlete

function buildAthletePath(athleteId, jsonData, year = null) {
    let link = [];
    let athleteInfo = jsonData[athleteId.toString()];

    let athleteCountryCoord = [athleteInfo['athlete_country_coord'][1],athleteInfo['athlete_country_coord'][0]];

    for (let gameYear in athleteInfo['games_participation']) {

        let gameDetails = athleteInfo['games_participation'][gameYear];
        const long =  gameDetails['games_country_coord'][1];
        const lat = gameDetails['games_country_coord'][0];

        if (year !== null) {
            if (gameYear >= year) {
            link.push({
                'type': 'LineString',
                'coordinates': [athleteCountryCoord, [long, lat]]
            });
            athleteCountryCoord = [long, lat];
            }
        } else {
        
            link.push({
                'type': 'LineString',
                'coordinates': [athleteCountryCoord, [long,lat]]
            });
            athleteCountryCoord = [long,lat];
        }
    }

    if (year !== null) {
        return link.length === 1 ? false : link;
    }
 
  return link;
}

function pointsToPath(linePropObject, randomSlope, randomCurve,randomInvert) {
  fromX = projection(linePropObject.coordinates[0])[0];
  fromY = projection(linePropObject.coordinates[0])[1];
  toX = projection(linePropObject.coordinates[1])[0];
  toY = projection(linePropObject.coordinates[1])[1];

  
  const centerPoint = [ (fromX + toX) / 2, (fromY + toY) / 2];
  const slope = (toY - fromY) / (toX - fromX);
  const invSlope = -1 / slope;
  const distance = Math.sqrt( Math.pow((toX - fromX), 2) + Math.pow((toY - fromY), 2) );
  const offset = (randomInvert*randomSlope) * randomCurve * Math.sqrt(distance);
  const angle = Math.atan(slope);
  //Math.cos(angle) = offsetY/offset;
  //Math.sin(angle) = offsetX/offset;
  const offsetY = Math.cos(angle)*offset;
  const offsetX = Math.sin(angle)*offset;
  //if slope = 0 then effectively only offset y-direction
  const offsetCenter = [centerPoint[0] - offsetX, centerPoint[1] + offsetY];
  const arcPointX = offsetCenter[0]
  const arcPointY = offsetCenter[1]   
  return 'M' + fromX + ' ' + fromY + 'Q' + arcPointX + ' ' + arcPointY +
          ' ' + toX + ' ' + toY;
  }


function buildAthleteMedalFromId(athleteId, jsonData, gamesData, year = null){
  let medals = [];
  const athleteInfo = jsonData[athleteId.toString()];
  // console.log(athleteInfo);
  
  for (let gameYear in athleteInfo['games_participation']) {
      
      const gameDetails = athleteInfo['games_participation'][gameYear];
      const cityOfGames = gamesData.filter(d => d['edition_id'] === gameDetails['games_id'].toString())[0]['city'];
      const gold =  gameDetails['gold'];
      const silver = gameDetails['silver'];
      const bronze = gameDetails['bronze'];

      if (year === null || gameYear >= year) {
        medals.push({'gameYear': gameYear, 'gold': gold, 'silver': silver, 'bronze': bronze, 'city': cityOfGames});
      }
    }

return medals;
}

function buildYearParticipationFromAthleteList(athleteList, jsonData){
  let yearParticipation = new Set();
  for (let athleteId of athleteList){
    let athleteInfo = jsonData[athleteId.toString()];
    for (let gameYear in athleteInfo['games_participation']) {
      if (!yearParticipation.has(gameYear)){
        yearParticipation.add(gameYear);
      }
    }
  }
  return yearParticipation;
}

function buildCountryMedalFromAthleteList(countryName, athleteList, jsonData, medalCountryData, gamesData, year = null){

  let medals = [];
  const yearParticipation = buildYearParticipationFromAthleteList(athleteList, jsonData);
  // console.log(yearParticipation);

  for (let gameYear of yearParticipation){
    const medalInfoForCountry = medalCountryData.filter(d => d['country'] === countryName && d['year'] === gameYear)[0];
    // console.log(yearParticipation);
    const cityOfGames = gamesData.filter(d => d['year'] === gameYear)[0]['city'];
    if (medalInfoForCountry !== undefined){
      medals.push({'gameYear': gameYear, 'gold': medalInfoForCountry['gold'], 'silver': medalInfoForCountry['silver'], 'bronze': medalInfoForCountry['bronze'], 'city' : cityOfGames });
    } else {
      medals.push({'gameYear': gameYear, 'gold': 0, 'silver': 0, 'bronze': 0, 'city' : cityOfGames });
    }
  }
  return medals;
  }


function buildAthleteListFromACountry(countryCode, jsonData, year = 2016){
  let athleteList = [];

  for (let athleteId in jsonData) {
    let athleteInfo = jsonData[athleteId.toString()];
    if (athleteInfo['athlete_country_name'] === countryCode && athleteInfo['games_participation'][year] !== undefined) {
      athleteList.push(athleteId);
    }
  }
  return athleteList;
}


function drawPathFromAnAthleteList(athleteList, athleteData, athleteBioData, gamesData){
  // console.log(athleteBioData);
  // Clear all intervals before removing the paths
  intervalIds.forEach(clearInterval);

  // Reset the interval IDs array
  intervalIds = [];
  d3.selectAll(".pathGroup").remove();
  d3.selectAll(".movingCircle").remove();
  athleteList.forEach( (athlete_id,index) => {
    const athleteBio =  buildAthletBioFromId(athlete_id,athleteData,athleteBioData);
    // console.log(athleteBio);
    const athlete_path = buildAthletePath(athlete_id, athleteData);
    
                
    // A path generator
    max = 1.1;
    min = 0.9;

    const randomInvert = Math.random() < 0.5 ? -1 : 1;
    const randomSlope = Math.random() * (max - min + 1) + min; 
    const randomCurve = Math.random() * (1.7 - 0.95 + 1) + min; 

    // Add the path
    let randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    let path = g
    .append('g')
    .attr('class', 'pathGroup')
    .selectAll("myPath")
    .data(athlete_path)
    .enter()
    .append("path")
      .attr("d", function(d){return pointsToPath(d, randomSlope, randomCurve, randomInvert)})
      .attr("class","path"+athlete_id.toString())
      .style("fill", "none")
      .style("stroke", randomColor.toString())  
      .style("stroke-width", 2)
      .attr("stroke-dasharray", function() {
        const thisPathLength = this.getTotalLength();
        return thisPathLength + " " + thisPathLength;
    })
    .attr("stroke-dashoffset", function() {
        return this.getTotalLength();
    })
    // .attr("marker-end", "url(#arrowhead)");

    path.on("mouseover", function(event,d) {
      g.selectAll(".path"+athlete_id.toString()).style("stroke-width", 6)})
    .on("mouseout", function(event,d) {
      g.selectAll(".path"+athlete_id.toString()).style("stroke-width", 2)})
    .on("click", function(event,d) {
  
      // Get the athlete id from the path
      const athlete_id = d3.select(this).attr("class").split("path")[1];
      // console.log(athlete_id);
      
      const medalsData = buildAthleteMedalFromId(athlete_id, athleteData, gamesData);
      drawJourneyFromMedalsData(medalsData);
      const athleteBio =  buildAthletBioFromId(athlete_id,athleteData,athleteBioData);
      displayBio(athleteBio);
      
    })
    .append('title')
    .text(d => getAthleteInfoFromId(athlete_id, athleteData));

    // console.log(path);  
    path.each(function(d, i) {
      let thisPath = d3.select(this);
      // .attr("marker-end", "none")
      thisPath.transition()  // Add a transition
          .delay(i * 1000)  // delay the transition for each path
          .duration(1000)  // Set the duration of the transition
          .attr("stroke-dashoffset", 0)
          .on("end", function() {
            let intervalId = setInterval(function() {
                // Add a circle that moves along the path
                let circle = g.append("circle")
                    .attr("class",'movingCircle')
                    .attr("r", 3)  // Set the radius of the circle
                    .attr("fill", randomColor.toString());  // Set the fill color of the circle

                circle.transition()  // Add a transition
                    .duration(2500)  // Set the duration of the transition
                    .attrTween("transform", function() {
                        let length = thisPath.node().getTotalLength();
                        return function(t) {
                            let point = thisPath.node().getPointAtLength(t * length);
                            return "translate(" + point.x + "," + point.y + ")";
                        };
                  })
                  // .on("end", function() {
                  //     circle.remove();  // Remove the circle when the transition ends
                  // });
          }, 3000);
          // Add the interval ID to the array
        intervalIds.push(intervalId);
      });
    });


    });
}

function drawJourneyFromMedalsData(medalsData){
  // Clean Graph before redrawing
  graph.selectAll(".bar").remove();
  graph.selectAll(".axis").remove();

  const svg_width = width*0.8 // - margin.left - margin.right,
  const svg_height = 120 // - margin.top - margin.bottom;

  // List of subgroups = header of the csv files = soil condition here
  const subgroups = ['gold','silver','bronze']

  // List of groups = species here = value of the first column called group -> I show them on the X axis
  const groups = d3.map(medalsData, function(d){return(d.gameYear+" : "+d.city)}).keys()

  // Add X axis
  const x = d3.scaleBand()
      .domain(groups)
      .range([0, svg_width])

  const xAxis = graph.append("g")
    .attr("transform", "translate(0," + svg_height*0.9 + ")")
    .attr("class","axis")
    .call(d3.axisBottom(x));

  // Customize tick labels
  xAxis.selectAll("text")
  .style("font-family", "Poppins")  // replace with your desired font
  .style("font-weight", "bold")
  .style("font-size", "1em")

  // Add Y axis
  const maxY = 5;
  const y = d3.scaleLinear()
    .domain([0, maxY])
    .range([ svg_height, 0 ]);

  graph.append("g")
    .attr("class","axis")
    .style("display", "none")
    .call(d3.axisLeft(y));

  // Another scale for subgroup position?
  const xSubgroup = d3.scaleBand()
    .domain(subgroups)
    .range([0, x.bandwidth()])
    .padding([0.5])

  // color palette = one color per subgroup
  const color = d3.scaleOrdinal()
    .domain(subgroups)
    .range(['#FFD700','#C0C0C0','#CD7F32'])


  // Show the bars
  bar = graph.append("g")
    .attr("class","bar")
    .attr("transform", function(d) { 
      return "translate(" + (xSubgroup.bandwidth() / 2 ) + ",0)"; 
    })
    .selectAll("g")
    // Enter in data = loop group per group
    .data(medalsData)
    .enter()
    .append("g")
    .attr("transform", function(d) { return "translate(" + x(d.gameYear+ ' : '+ d.city) + ",0)"; })
    .selectAll("rect")
    .data(function(d) { return subgroups.map(function(key) { return {key: key, value: d[key]}; }); })
    .enter()
    .append("g")
    
    bar.append("rect")
      .attr("x", function(d) { return xSubgroup(d.key); })
      .attr("y", function(d) { return y(1); })
      .attr("width", xSubgroup.bandwidth())
      .attr("height", y(maxY-1))//function(d) { return height - y(d.value); })
      .attr("fill", function(d) { return color(d.key); })
      .attr("rx", 3)  // arrondit les coins horizontalement
      .attr("ry", 3) // arrondit les coins verticalement
      .attr("transform", "translate(" + (-xSubgroup.bandwidth() / 2) + "," + (-y(4)) + ")");

    bar.append('text')
      .text(function(d) { return d.value; })
      .attr("x", function(d) { return xSubgroup(d.key); })
      .attr("y", function(d) { return  y(2) + y(maxY-1) / 2; })
      .attr("text-anchor", "middle")
      .style("font-family", "Poppins")  
      .style("font-weight", "bold")
      .style("font-size", "12px")
      .style("fill", "darkblue")
      .attr("dominant-baseline", "middle")
    }

function buildAthletBioFromId(athleteId,athleteData,athleteBioData){
  // console.log(athleteBioData)
  // athleteBioData = await d3.csv('./Olympics Data From 1986 to 2022/Olympic_Athlete_Bio.csv')

  const athleteBio = athleteBioData.filter(d => d['athlete_id'] === athleteId.toString())[0];
  const athleteSport = athleteData[athleteId.toString()]['sport_type'];
  // console.log(athleteSport);
  athleteBio['sport_type'] = athleteSport;
  return athleteBio;
}

function displayBio(bio){
  const bioDiv = d3.select(".bio");
  bioDiv.selectAll("div").remove();
  bioDiv.html(`
  <div class = 'bioInformation'> <span style="font-weight: bold; text-decoration: underline;"> Name:</span> ${bio.name}</div>
  <div class = 'bioInformation'><span style="font-weight: bold; text-decoration: underline;"> Sports:</span> ${bio.sport_type}</div>
  <div class = 'bioInformation'> <span style="font-weight: bold; text-decoration: underline;"> Date of Birth:</span> ${bio.born}</div>
  <div class = 'bioInformation'> <span style="font-weight: bold; text-decoration: underline;"> Country:</span> ${bio.country}</div>
  <div class = 'bioInformation'> <span style="font-weight: bold; text-decoration: underline;"> Sex:</span> ${bio.sex}</div>
  <div style="font-weight: bold; text-decoration: underline; "> Description:</div> <div class = 'bioDescription'>${bio.description}</div>  `);
}

// Declare a variable to hold the interval IDs
let intervalIds = [];
id_to_plot = ["103315","11524","127932","47512","133746"];


// Show the loading screen
document.getElementById('loading').style.display = 'block';

Promise.all([
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'),
  d3.json('./athlete_data_medals.json'),
  d3.csv('./Olympics Data From 1986 to 2022/Olympic_Athlete_Bio.csv'),
  d3.csv('./Olympics Data From 1986 to 2022/Olympic_Games_Medal_Tally.csv'),
  d3.csv('./Olympics Data From 1986 to 2022/Olympics_Games.csv')
]).then(([data, athleteData, athleteBioData, medalCountryData, gamesData]) => {

        document.getElementById('loading').style.display = 'none';
        const countries = topojson.feature(data, data.objects.countries);
        // console.log(countries);
        // const athlete_id = "103315";
        
        
        const countriesPath = g.selectAll('path')
            .data(countries.features)
            .enter()
            .append('path')
            .attr('class', 'country')
            .attr('d', pathGenerator)
            .attr('fill', 'url(#greyDots)')
            
        countriesPath.on("mouseover", function(event, d) {
              // Change the color of the dot pattern in the hovered country
              d3.select(this)  // select the hovered country
                  .attr('fill', 'url(#redDots)')  // replace "#dotsRed" with the id of your red dot pattern
          });

        countriesPath.on("mouseout",  function(event, d) {
              // Change the color of the dot pattern back to the original color
              d3.select(this)  // select the hovered country
                  .attr('fill', 'url(#greyDots)');  // replace "#dots" with the id of your original dot pattern
          });

        
        countriesPath.on("click", function(event, d) {
          const bioDiv = d3.select(".bio");
          bioDiv.selectAll("div").remove();
          const countryName = event.properties.name;
          // console.log(athleteBioData)
          const athleteList = buildAthleteListFromACountry(countryName, athleteData);
          drawPathFromAnAthleteList(athleteList, athleteData, athleteBioData, gamesData);
          const countryMedals = buildCountryMedalFromAthleteList(countryName, athleteList, athleteData, medalCountryData, gamesData);
        
          drawJourneyFromMedalsData(countryMedals);
        });

        drawPathFromAnAthleteList(id_to_plot, athleteData, athleteBioData, gamesData);
});
