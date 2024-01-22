// the map
const width = window.innerWidth*0.7;
const height = window.innerHeight*0.9;

const rootSvg = d3.select('.map')    
              .append('svg')
              .attr('class', 'rootSvg')
              .attr('width', width)
              .attr('height', height);

       
const svg = d3.select('.rootSvg')
    .append('svg')
    .attr('class' , 'svg')
    .attr('width', width)
    .attr('height', height*0.6)
    .attr('y', height*0.025)

// Group for the map
const g = svg.append('g');

    
// SVG for the graph
const graph = rootSvg.append('svg')
                  .attr('class' , 'graph')
                  .attr('width', width)
                  .attr('x', width*0.1)
                  .attr('y', height*0.63);
 
 // Projection
const projection = d3.geoMercator().scale(150).translate([width / 2, height / 2.2]);
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
  .attr('r', 1)
  // .attr('fill', 'rgba(189, 195, 199, 1)');

const redPattern = svg.append('defs')
.append('pattern')
  .attr('id', 'redDots')
  .attr('patternUnits', 'userSpaceOnUse')
  .attr('width', 4)
  .attr('height', 4);

  redPattern.append('circle')
.attr('cx', 2)
.attr('cy', 2)
.attr('r', 1)
// .attr('fill', 'red');

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

function pointsToPath(linePropObject, randomSlope, randomCurve, randomInvert) {
  // if linePropObject is a list of paths then we need to loop over the list
  if (Array.isArray(linePropObject)) {
    let pathString = '';
    for (let line of linePropObject) {
      pathString += pointsToPath(line, randomSlope, randomCurve, randomInvert);
    }
    return pathString;
  }

  fromX = projection(linePropObject.coordinates[0])[0];
  fromY = projection(linePropObject.coordinates[0])[1];
  toX = projection(linePropObject.coordinates[1])[0];
  toY = projection(linePropObject.coordinates[1])[1];

  //   // A path generator
  // max = 1.1;
  // min = 0.9;

  // const randomInvert = Math.random() < 0.5 ? -1 : 1;
  // const randomSlope = Math.random() * (max - min + 1) + min; 
  // const randomCurve = Math.random() * (1.7 - 0.95 + 1) + min; 
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
    const medals = [];
    const athleteInfo = jsonData[athleteId];
  
    // Create a lookup object from the gamesData array
    const gamesLookup = {};
    gamesData.forEach(game => {
      gamesLookup[game['edition_id']] = game['city'];
    });
  
    for (let gameYear in athleteInfo['games_participation']) {
      const gameDetails = athleteInfo['games_participation'][gameYear];
      // Use the lookup object to find the city of the games
      const cityOfGames = gamesLookup[gameDetails['games_id']];
      const { gold, silver, bronze } = gameDetails;
  
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

function buildCountryMedalFromAthleteList(countryNoc, athleteList, jsonData, medalCountryData, gamesData, year = null){

  let medals = [];
  const yearParticipation = buildYearParticipationFromAthleteList(athleteList, jsonData);
  
  for (let gameYear of yearParticipation){
    const cityOfGames = gamesData.filter(d => d['year'] === gameYear)[0]['city'];

    if (Array.isArray(countryNoc)){
      let gold = 0;
      let silver = 0;
      let bronze = 0;
      for(let countryNocIter of countryNoc){
        const medalInfoForCountry = medalCountryData.filter(d => d['country_noc'] === countryNocIter && d['year'] === gameYear)[0];
        if (medalInfoForCountry !== undefined){
          gold +=parseInt(medalInfoForCountry['gold'],10);
          silver +=parseInt(medalInfoForCountry['silver'],10);
          bronze +=parseInt(medalInfoForCountry['bronze'],10);
        } 
      }
      medals.push({'gameYear': gameYear, 'gold': gold, 'silver': silver, 'bronze': bronze, 'city' : cityOfGames });
    }else{
      const medalInfoForCountry = medalCountryData.filter(d => d['country_noc'] === countryNoc && d['year'] === gameYear)[0];
      if (medalInfoForCountry !== undefined){
        medals.push({'gameYear': gameYear, 'gold': medalInfoForCountry['gold'], 'silver': medalInfoForCountry['silver'], 'bronze': medalInfoForCountry['bronze'], 'city' : cityOfGames });
      } else {
        medals.push({'gameYear': gameYear, 'gold': 0, 'silver': 0, 'bronze': 0, 'city' : cityOfGames });
      }
    }
  }

  medals.sort((a, b) => a.gameYear - b.gameYear);

  return medals;
  }


function buildAthleteListFromACountry(countryCode, jsonData, year = 2016){
  let athleteList = [];

  for (let athleteId in jsonData) {
    let athleteInfo = jsonData[athleteId.toString()];
    if (athleteInfo['athlete_country_code'] === countryCode && athleteInfo['games_participation'][year] !== undefined) {
      athleteList.push(athleteId);
    }
  }
  return athleteList;
}


function addMovingCircleOnPath(isLongLength, athleteData, gamesData,athleteBioData,drawLegend = false)  {

  return function(d,i) {
    let thisPath = d3.select(this);
    let stoppingCercleAdded = false;
    let randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    let length = thisPath.node().getTotalLength();

    const athlete_id = thisPath._groups[0][0].id.replace("path","");

    const delay = isLongLength ? Math.min(i*30,2000): i * 500;

    if(drawLegend){
      const allPath = d3.selectAll("#path"+athlete_id);
      legendDiv = d3.select(".legend");
      legendDiv.append("div")
      .attr("class","legendItem")
      .text(getAthleteInfoFromId(athlete_id, athleteData))
      .style("background-color", randomColor)
      .on("mouseover", function(event,d) {
        allPath.style("stroke-width", 6)})
      .on("mouseout", function(event,d) {
        allPath.style("stroke-width", 2)})
      .on("click", function(event,d) {
        const medalsData = buildAthleteMedalFromId(athlete_id, athleteData, gamesData);
        const athleteBio =  buildAthletBioFromId(athlete_id,athleteData,athleteBioData);
        drawJourneyFromMedalsData(medalsData);
        displayBio(athleteBio);
        })
    } 

    thisPath.style("stroke", randomColor)
    thisPath.transition()
        .delay(delay)
        .duration(1000)
        .attr("stroke-dashoffset", 0)
        .on("end", function() {
          let circle = g.append("circle")
              .attr("class",'movingCircle')
              .attr("r", 3)
              .attr("fill", randomColor)
              

          
          let startTime;
          let animationId;

          function animateCircle(timestamp) {
            if (!startTime) startTime = timestamp;
            let progress = timestamp - startTime;
            let t = progress / 3000;
          
            if (t > 1) {
              // console.log(t)
              t = 0; // Reset t
              startTime = undefined; // Reset startTime
                if (!stoppingCercleAdded) {
                  // add only one time a circle at the end of the path
                  g.append("circle")
                  .attr("class",'stoppingCircle')
                  .attr("r", 3)
                  .attr("fill", randomColor)
                  .attr("transform", "translate(" + thisPath.node().getPointAtLength(length).x + "," + thisPath.node().getPointAtLength(length).y + ")")
                  .on("click", function(event,d) {
                    const medalsData = buildAthleteMedalFromId(athlete_id, athleteData, gamesData);
                    const athleteBio =  buildAthletBioFromId(athlete_id,athleteData,athleteBioData);
                    drawJourneyFromMedalsData(medalsData);
                    displayBio(athleteBio);
                    })
                  .on("mouseover", function(event,d) {
                    d3.select(this).attr("r", 5);
                  })
                  .on("mouseout", function(event,d) {
                    d3.select(this).attr("r", 3);
                  });

                  
                  stoppingCercleAdded = true;

                }
            }

            animationId = requestAnimationFrame(animateCircle); // Always schedule the next frame
            intervalIds.push(animationId);
            let point = thisPath.node().getPointAtLength(t * length);
            circle.attr("transform", "translate(" + point.x + "," + point.y + ")");
          }

          requestAnimationFrame(animateCircle);
        })        
  }
}

function drawPathFromAnAthleteList(athleteList, athleteData, athleteBioData, gamesData){
  // console.log(athleteBioData);
  // Clear all intervals before removing the paths
  intervalIds.forEach(cancelAnimationFrame);
  const bioDiv = d3.select(".bio");
  bioDiv.selectAll("div, h2").remove();
  d3.selectAll(".bar").remove();
  d3.selectAll(".axis").remove();
  d3.selectAll(".legendItem").remove();

  let drawLegend = false;

  if (athleteList.length <16) {
    drawLegend = true;
  }
  // Reset the interval IDs array
  intervalIds = [];
  d3.selectAll(".pathGroup, .movingCircle, .stoppingCircle").remove();

  // Create an empty object to store the paths
  let athletePaths = [];

  // Loop over the athleteList and build the paths
  athleteList.forEach((athlete_id) => {
    athletePaths.push({'id':athlete_id, 'path': buildAthletePath(athlete_id, athleteData)});
  });

  let isLongLength = athleteList.length > 30 ? true : false;
  

  let path = g.selectAll("myPath")
              .data(athletePaths)
              .join("path")
              .attr("class", "pathGroup")
              .attr("d", function(d){
              // A path generator
                const max = 1.1;
                const min = 0.9;

                const randomInvert = Math.random() < 0.5 ? -1 : 1;
                const randomSlope = Math.random() * (max - min + 1) + min; 
                const randomCurve = Math.random() * (1.7 - 0.95 + 1) + min; 
                
                return pointsToPath(d.path, randomSlope, randomCurve, randomInvert)})
              .attr("id",d => "path"+d.id.toString())
              .style("fill", "none")
              .style("stroke-width", 2)
              .attr("stroke-dasharray", function() {
                  const thisPathLength = this.getTotalLength();
                  return thisPathLength + " " + thisPathLength;
              })
              .attr("stroke-dashoffset", function() {
                  return this.getTotalLength();
              })
              
              .each(addMovingCircleOnPath(isLongLength, athleteData, gamesData,athleteBioData,drawLegend))
              

            path.append('title')
              .text(d => getAthleteInfoFromId(d.id, athleteData) );

            // const allPath = g.selectAll("#path"+athlete_id.toString());
            path.on("mouseover", function(event,d) {
                  const allPath = d3.selectAll("#path"+event.id);
                  allPath.style("stroke-width", 6)})
                
                .on("mouseout", function(event,d) {
                  const allPath = d3.selectAll("#path"+event.id);
                  allPath.style("stroke-width", 2)})
                  
                .on("click", function(event,d) {
            
                // Get the athlete id from the path
                const athlete_id = event.id;
                
                const medalsData = buildAthleteMedalFromId(athlete_id, athleteData, gamesData);
                drawJourneyFromMedalsData(medalsData);
                const athleteBio =  buildAthletBioFromId(athlete_id,athleteData,athleteBioData);
                displayBio(athleteBio);
                
              })

}

function mapRange(value) {
  const inputMin = 22;
  const inputMax = 30;
  const outputMin = 52;
  const outputMax = 60;

  return ((value - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin) + outputMin;
}

function drawJourneyFromMedalsData(medalsData){
  // Clean Graph before redrawing
  graph.selectAll(".bar").remove();
  graph.selectAll(".axis").remove();
  const bioDiv = d3.select(".bio");
  bioDiv.selectAll("div, h2").remove();

  const margin = {top: 20, right: 30, bottom: 30, left: 60}
  const svg_width = width*0.8 // - margin.left - margin.right,
  const svg_height = 120  - margin.top ;// - margin.bottom;

  // List of subgroups = header of the csv files = soil condition here
  const subgroups = ['gold','silver','bronze']

  // List of groups = species here = value of the first column called group -> I show them on the X axis
  const groups = d3.map(medalsData, function(d){return(d.gameYear+" : "+d.city)}).keys()

  // Add X axis
  const x = d3.scaleBand()
      .domain(groups)
      .range([0, svg_width])

  // console.log(groups)
  const xAxis = graph.append("g")
    .attr("transform", "translate(0," + svg_height*0.55 + ")")
    .attr("class","axis")
    .call(d3.axisBottom(x))
    .transition()  // Add transition for a smooth effect
    

  const fontSize = Math.min(Math.max(x.bandwidth() / 20, 10), 16); 

  // Customize tick labels
  xAxis.selectAll("text")
  .attr("y", -mapRange(fontSize))
  .style("font-size", function(d) {  // adjust this value as needed
    return fontSize + "px"; 
  })

  // Add Y axis
  const maxY = 2;
  const y = d3.scaleLinear()
    .domain([0, maxY])
    .range([ 0, svg_height ]);

  // Y axis for dots
  const maxYDots = 18;
  const yDots = d3.scaleLinear()
    .domain([0, maxYDots])
    .range([ 2.6*svg_height/4, svg_height+2.6*svg_height/4 ]);

  graph.append("g")
    .attr("class","axis")
    .style("display", "none")
    .call(d3.axisLeft(y));

  // Another scale for subgroup position?
  const xSubgroup = d3.scaleBand()
    .domain(subgroups)
    .range([x.bandwidth()/4, 3*x.bandwidth()/4])
    .padding(0.1)

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


    
    bar.join(
      enter => enter.append('rect')
                    .attr("x", function(d) { return xSubgroup(-d.key); })
                    .call(enter => enter.transition(3000)
                    .attr("x", function(d) { return xSubgroup(d.key); }))
    )
      // .attr("x", function(d) { return xSubgroup(d.key); })
      .attr("y", function(d) { return y(0.5); })
      .attr("width", xSubgroup.bandwidth())
      .attr("height", y(1)/2)//function(d) { return height - y(d.value); })
      .attr("fill", function(d) { return color(d.key); })
      .attr("rx", 3)  // arrondit les coins horizontalement
      .attr("ry", 3) // arrondit les coins verticalement
      .attr("transform", "translate(" + (-xSubgroup.bandwidth() / 2) + ",0)");

    bar.join(
      enter => enter.append('text')
                    .attr("x", function(d) { return xSubgroup(-d.key); })
                    .call(enter => enter.transition(3000)
                    .attr("x", function(d) { return xSubgroup(d.key); }))
    )
      .text(function(d) { return d.value; })
      // .attr("x", function(d) { return xSubgroup(d.key); })
      .attr("y", function(d) { return y(0.5+0.25); })
      .attr("text-anchor", "middle")
      .style("font-family", "Poppins")  
      .style("font-weight", "bold")
      .style("font-size", "13px")
      .style("fill", "white")
      .attr("dominant-baseline", "middle")



        // Show the same amount of dot per medal number on each categories

  dots_bar = graph.append("g")
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
  .each(function(medalType) {
    // console.log(medalType);
    d3.select(this)
      .selectAll('circle')
      .data(d3.range(medalType.value)) // create an array with as many elements as d.value
      .join(
        enter => 
        enter.append('circle')
            .attr("cx", function(d,i) { 
            let xCorrd;
            if (medalType.value > 18) {
              const bandwidth = xSubgroup.bandwidth();
              xCorrd = i < 18 ? xSubgroup(medalType.key) - bandwidth / 4 : xSubgroup(medalType.key) + bandwidth / 4;
              if (medalType.value > 36){
                xCorrd = i < 18 ? xSubgroup(medalType.key) - bandwidth / 4 : i < 36 ? xSubgroup(medalType.key) : xSubgroup(medalType.key) + bandwidth / 4;
              }
            } else {
              xCorrd = xSubgroup(medalType.key)
            };
            return xCorrd } ) // adjust as needed
          .attr("cy", 100 )
          .attr("r", function(d,i) { 
            let radius;
            if (medalType.value > 36) {
                radius = 1.8;
            } else {
                radius = 2.1;
            };
            return radius } )
          .style("fill", function (d) { return color(medalType.key) } )
          .call(enter => enter.transition(3000)
                .attr("cy", function (d, i) { return yDots(i%18); }))
      )

  });
    }

    function buildAthletBioFromId(athleteId, athleteData, athleteBioData){
      // Create a lookup object from the athleteBioData array
      let bioLookup = {};
      athleteBioData.forEach(bio => {
        bioLookup[bio['athlete_id']] = bio;
      });
    
      const athleteIdStr = athleteId.toString();
      const athleteBio = bioLookup[athleteIdStr];
      const athleteSport = athleteData[athleteIdStr]['sport_type'];
      athleteBio['sport_type'] = athleteSport;
      return athleteBio;
    }

function displayBio(bio,isCountry = false){
  const bioDiv = d3.select(".bio");
  bioDiv.selectAll("div").remove();
  if (isCountry){
    console.log(bio);
    bioDiv.html(`
    <div class = 'bioInformation'> <span style="font-weight: bold; text-decoration: underline;"> Country Name:</span> ${bio} </div>`);
  }else{
    bioDiv.html(`
    <h2> Athlete Information </h2>
    <div class = 'bioInformation'> <span style="font-weight: bold; text-decoration: underline;"> Name :</span> ${bio.name}</div>
    <div class = 'bioInformation'><span style="font-weight: bold; text-decoration: underline;"> Sports :</span> ${bio.sport_type}</div>
    <div class = 'bioInformation'> <span style="font-weight: bold; text-decoration: underline;"> Date of Birth :</span> ${bio.born}</div>
    <div class = 'bioInformation'> <span style="font-weight: bold; text-decoration: underline;"> Country :</span> ${bio.country}</div>
    <div class = 'bioInformation'> <span style="font-weight: bold; text-decoration: underline;"> Sex :</span> ${bio.sex}</div>
    <div style="font-weight: bold; text-decoration: underline; "> Description :</div> <div class = 'bioDescription'>${bio.description}</div>`);
  }
}

function getCountryCodeFromCountryMapName(countryMapName,olympicsCountryData,isOlympicCode = false){
  if (countryMapName === "Greenland"){
    countryMapName = "Denmark";
  }

  let inter_code = olympicsCountryData.filter(d => d['map_name'] === countryMapName)[0]['inter_code'];  

  if (!isOlympicCode){
    return inter_code;
  }else{
    const country_noc_list = olympicsCountryData.filter(d => d['inter_code'] === inter_code).map(d => d['country_noc']);
    // console.log(country_noc_list);
    return country_noc_list;
  }
}

// Declare a variable to hold the interval IDs
let intervalIds = [];
id_to_plot = ["103315","11524","127932","47512","133746"];

// Show the loading screen
document.getElementById('loading').style.display = 'block';


Promise.all([
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'),
  d3.json('./Olympics Data From 1986 to 2022/athlete_data_medals.json'),
  d3.csv('./Olympics Data From 1986 to 2022/Olympic_Athlete_Bio.csv'),
  d3.csv('./Olympics Data From 1986 to 2022/Olympic_Games_Medal_Tally.csv'),
  d3.csv('./Olympics Data From 1986 to 2022/Olympics_Games.csv'),
  d3.csv('./Olympics Data From 1986 to 2022/Olympics_Country.csv')
]).then(([data, athleteData, athleteBioData, medalCountryData, gamesData, olympicsCountryData]) => {


        d3.select('#loading')
        .style('display', 'none');

        // buildReadMe();

        let year = 2016;

        const countries = topojson.feature(data, data.objects.countries);
        
        const bioDiv = d3.select(".bio");
        bioDiv.selectAll("div, h2").remove();
        graph.selectAll(".bar").remove();
        graph.selectAll(".axis").remove();

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
          let year = yearInput.property("value");
          const countryName = event.properties.name;
          const countryCode = getCountryCodeFromCountryMapName(countryName,olympicsCountryData);
          const athleteList = buildAthleteListFromACountry(countryCode, athleteData, year);
          const countryNoc = getCountryCodeFromCountryMapName(countryName,olympicsCountryData,true);
          const countryMedals = buildCountryMedalFromAthleteList(countryNoc, athleteList, athleteData, medalCountryData, gamesData);


          drawPathFromAnAthleteList(athleteList, athleteData, athleteBioData, gamesData);
          drawJourneyFromMedalsData(countryMedals);
          displayBio(countryName,true);
        });

        // add a option to select a list of athletes
        const allAthleteList = Object.keys(athleteData).map(function(d) {return {'id': d, 'name': athleteData[d]['athlete_name']}});
        console.log(allAthleteList.length);
        const optionDiv = d3.select(".optionChoice");
        const listOfAthletesToDisplay = [];
        const selectedAthletesDiv = d3.select(".athleteSelection");
        selectedAthletesDiv.append("div").attr("class", "selectedAthletes");
        // Create search input
        let searchInput = optionDiv.append("input")
        .attr("type", "text")
        .attr("placeholder", "Search for athletes..")
        .on("input", updateSuggestions);

        let suggestionBox = optionDiv.append("div").attr("class", "suggestions");

        // Create year input
        let yearInput = selectedAthletesDiv.append("input")
        .attr("type", "number")
        .attr("value", year)
        .attr("class", "yearInput")
        .attr("placeholder", "Enter year")
        .attr("min", "1896") // The first modern Olympics were held in 1896
        .attr("max", "2022"); // Adjust this to the current year or the latest year in your data

        //Create a button to show read me
        let readMeButton = selectedAthletesDiv.append("button")
                          .attr("class", "readMeButton")
                          .text("Read Me")
                          .on("click", function() {
                            let readmeDiv = d3.select(".readmePopup")
                            .attr("class", "readmePopupOpen");
                            
                            d3.select(".readmePopupOpen button").remove();
                            d3.select(".readmePopupOpen").append("button")
                            .text("Close Read Me")
                            .on("click", function() {
                              readmeDiv.attr("class", "readmePopup") // Hide the popup when the button is clicked
                            });
                          });


        //make a button to update the graph
        let updateButton = optionDiv.append("button")
        .attr("class", "updateButton")
        .text("Update Map")
        .on("click", function() {
        drawPathFromAnAthleteList(listOfAthletesToDisplay, athleteData, athleteBioData, gamesData);
        })

        // Create a button to clear the selected athletes
        let clearButton = optionDiv.append("button")
        .attr("class", "clearButton")
        .text("Clear List")
        .on("click", function() {
        listOfAthletesToDisplay.length = 0;
        updateSelectedAthletes(listOfAthletesToDisplay,athleteData);
        });

        

function updateSuggestions() {
  let filter = this.value.toUpperCase();
  if (filter === "") {
    suggestionBox.selectAll("div").remove();
    return;
  }
  let matchedAthletes = allAthleteList.filter(function(d) {
    let txtValue = d.name.toUpperCase();
    return txtValue.indexOf(filter) > -1;
  });

  // Shuffle the matched athletes
  matchedAthletes = matchedAthletes.sort(() => Math.random() - 0.5);
  // Limit the number of suggestions to 10
  matchedAthletes = matchedAthletes.slice(0, 10);

  let suggestions = suggestionBox.selectAll("div")
    .data(matchedAthletes, function(d) { return d.id; });

  suggestions.exit().remove();

  suggestions.enter().append("div")
    .merge(suggestions)
    .text(function(d) { return d.name; })
    .on("click", function(d) {
      // Handle selection
      searchInput.property("value", "");
      suggestionBox.selectAll("div").remove();
      if (!listOfAthletesToDisplay.includes(d.id)) {
        listOfAthletesToDisplay.push(d.id);
      }
      updateSelectedAthletes(listOfAthletesToDisplay,athleteData);
    });
}

    drawPathFromAnAthleteList(id_to_plot, athleteData, athleteBioData, gamesData);
});


// Function to update the display of selected athletes
function updateSelectedAthletes(listOfAthletesToDisplay,jsonData) {
  let athletes = d3.select(".selectedAthletes")
    .selectAll("div")
    .data(listOfAthletesToDisplay);

    athletes.join("div")

    .attr("class", "athlete")
    .on("click", function(d) {
      // Handle removal
      listOfAthletesToDisplay.splice(listOfAthletesToDisplay.indexOf(d), 1);
      updateSelectedAthletes(listOfAthletesToDisplay,jsonData);
    })
    .text(function(d) { return getAthleteInfoFromId(d, jsonData); }) ;
}


// function buildReadMe() {
//   // Create the div for the popup
//   let readmeDiv = d3.select(".readmePopup")

//   // Create the close button
//   let closeButton = d3.select(".readmePopupOpen").append("button")
//     .text("Close")
//     .on("click", function() {
//       readmeDiv.attr("class", "readmePopup") // Hide the popup when the button is clicked
//     });
// }