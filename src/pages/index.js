import { useState, useEffect } from 'react';
import { VictoryChart, VictoryTooltip, VictoryBar, VictoryGroup } from 'victory';

const allMutationTypes = ["C>A", "C>G", "C>T", "T>A", "T>C", "T>G", "G>T", "G>C", "G>A", "A>T", "A>G", "A>C"]
const bases = ["A", "C", "G", "T"]
const twelveColors = ["#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c",
  "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b",
  "#c49c94"]
let allContexts = []
for (let base1 of bases) {
  for (let base2 of bases) {
    
      allContexts.push(base1 + base2)
    
  }
}
const PlotSpectrum = ({ data }) => {
  // supplement data with missing values
  const filledIn = {}
  for (let context of allContexts) {
    for (let mutation of allMutationTypes) {
      const key = `${context}_${mutation}`
      if (!data[key]) {
        filledIn[key] = {
          context,
          mutationType: mutation,
          percentage: 0
        }
      }
    }
  }
  const allData = {...filledIn, ...data}
  let counter = 0
  for (let mutationType of allMutationTypes) {
    for (let context of allContexts) {
      const key = `${context}_${mutationType}`
      
        allData[key].x = counter
        allData[key].label = `${context} (${mutationType})`
        counter++
        console.log(key,counter)

      
      
    }
  }

  console.log(allData)
  
  // plot grouped by mutation type with bars for each context
  return (
    <VictoryChart
    
      
    >
     <VictoryBar
      barRatio={1}
     labelComponent={<VictoryTooltip/>}
        data={Object.values(allData)}
        x="x"
        y="percentage"

        style={{
          data: {
            fill: ({ datum }) => {
              const mutationType = datum.mutationType
              return twelveColors[allMutationTypes.indexOf(mutationType)]
            },

          }
        }}
      />
      
    </VictoryChart>
  )
}


const fastaToRaw = (fasta) => {
  let lines = fasta.split('\n');
  let sequence = '';
  for(let line of lines) {
    if(line[0] !== '>') {
      sequence += line;
    }
  }
  return sequence;


}
const mutationTypes = [
  "A>C", "A>G", "A>T",
  "C>A", "C>G", "C>T",
  "G>A", "G>C", "G>T",
  "T>A", "T>C", "T>G"
];

const contexts = [
 "AA", "AC", "AG", "AT",
  "CA", "CC", "CG", "CT",
  "GA", "GC", "GG", "GT",
  "TA", "TC", "TG", "TT"
];




export default function Home() {
  const [sequenceFiles, setSequenceFiles] = useState(['sars-cov-2.fa', 'hiv.fa', 'Custom']);
  const [selectedFile, setSelectedFile] = useState('sars-cov-2.fa');

  const [sequence, setSequence] = useState('');
  const strippedSequence = fastaToRaw(sequence);
  const [mutations, setMutations] = useState('');
  const [output, setOutput] = useState('');
  const [isNormalized, setIsNormalized] = useState(true);

  const [mutData, setMutData] = useState({});

  useEffect(() => {
    if (selectedFile && selectedFile !== 'Custom') {
      fetch(`/${selectedFile}`)
        .then(res => res.text())
        .then(data => setSequence(data));
    } else {
      setSequence('');
    }
  }, [selectedFile]);

  const getContextOccurrences = () => {
    let occurrences = {};
    for(let i = 0; i < strippedSequence.length - 2; i++) {
      let context = strippedSequence.slice(i, i + 3);
      if(!occurrences[context]) {
        occurrences[context] = 0;
      }
      occurrences[context]++;
    }
    return occurrences;
  }

  const handleSubmit = () => {
    let mutationsList = mutations.split(',');
  
    let mutationStats = {};
    let contextOccurrences = isNormalized ? getContextOccurrences() : null;
  
    for(let mutation of mutationsList) {
      mutation = mutation.trim();
      let position = parseInt(mutation.slice(1, -1));
      let context = strippedSequence.slice(position - 2, position + 1);
      // drop the center base
      context = `${context[0]}${context[2]}`;
      let mutationType = `${mutation[0]}>${mutation[mutation.length - 1]}`;
      let key = `${context}_${mutationType}`;
      
      if (!mutationStats[key]) {
        mutationStats[key] = { count: 0, percentage: 0 };
      }
      mutationStats[key].count++;
      
    }
  
    let totalMutations = mutationsList.length;
    let sumRawPercentages = 0;
  
    for(let [key, stats] of Object.entries(mutationStats)) {
      let [context, mutationType] = key.split('_');
      
      if(isNormalized && contextOccurrences[context]) {
        stats.percentage = (stats.count / contextOccurrences[context]) * 100;
      } else {
        stats.percentage = (stats.count / totalMutations) * 100;
      }
      sumRawPercentages += stats.percentage;
    }
  
    let outputList = ['Context_Mutation\tPercentage'];

    // inverse sort
    let sortedMutationStats = Object.entries(mutationStats).sort((a, b) => b[1].percentage - a[1].percentage);
    const data = {}
    for(let [key, stats] of sortedMutationStats) {
      let [context, mutationType] = key.split('_');
      let normalizedPercentage = (stats.percentage / sumRawPercentages) * 100;
      outputList.push(`${context} (${mutationType})\t${normalizedPercentage.toFixed(2)}%`);
      data[key] = {
        context,
        mutationType,
        percentage: normalizedPercentage
      }
      
    }
    setMutData(data);
  
    setOutput(outputList.join('\n'));
    //data = buildDatasets(mutationStats);
    //setMutData(data);
  }
  

  return (
    <div className="container mx-auto p-4">
      <div>
        <label>Select a reference:</label>
        <select 
          className="border w-full p-2 my-2" 
          value={selectedFile} 
          onChange={(e) => setSelectedFile(e.target.value)}>
          <option value="" disabled>Select...</option>
          {sequenceFiles.map(file => (
            <option key={file} value={file}>{file}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Reference Sequence:</label>
        <textarea 
          className="border w-full p-2 my-2"
          value={sequence} 
          onChange={(e) => setSequence(e.target.value)} />
      </div>
      <div>
        <label>Mutations:</label>
        <textarea 
          className="border w-full p-2 my-2"
          value={mutations} 
          onChange={(e) => setMutations(e.target.value)} />
      </div>
      <label>
        <input 
          type="checkbox"
          checked={isNormalized}
          onChange={() => setIsNormalized(!isNormalized)}
        />
        Normalize by context occurrence
      </label>
      <div>
      <button 
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleSubmit}>
        Generate
      </button></div>
      <div>
        <label>Output:</label>
        <textarea 
          className="border w-full p-2 my-2"
          value={output} 
          readOnly />
      </div>

      {
        mutData &&
        <PlotSpectrum data={mutData} />

      }
      
      
    </div>
  )
}
