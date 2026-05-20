function generateData(count, yrange) {
  let i = 0;
  const series = [];
  while (i < count) {
    const x = (i + 1).toString();
    const y = Math.floor(Math.random() * (yrange.max - yrange.min + 1)) + yrange.min;
    series.push({
      x: x,
      y: y
    });
    i++;
  }
  return series;
}
export const basicHeatmapOpts = {
  chart: {
    height: 380,
    type: 'heatmap',
    toolbar: {
      show: false
    }
  },
  dataLabels: {
    enabled: false
  },
  colors: ['#1e84c4'],
  series: [{
    name: 'Metric 1',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 2',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 3',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 4',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 5',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric  6',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 7',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 8',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 9',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }],
  xaxis: {
    type: 'category'
  }
};
export const multipleHeatmapOpts = {
  chart: {
    height: 380,
    type: 'heatmap',
    toolbar: {
      show: false
    }
  },
  dataLabels: {
    enabled: false
  },
  colors: ['#1e84c4', '#53389f', '#7f56da', '#ff86c8', '#ed5565', '#ed5565', '#f9b931', '#1bb394', '#1bb394'],
  series: [{
    name: 'Metric 1',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 2',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 3',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 4',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 5',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 6',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 7',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 8',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric 9',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }],
  xaxis: {
    type: 'category'
  }
};
export const colorRangeHeatmapOpts = {
  chart: {
    height: 380,
    type: 'heatmap',
    toolbar: {
      show: false
    }
  },
  plotOptions: {
    heatmap: {
      shadeIntensity: 0.5,
      colorScale: {
        ranges: [{
          from: -30,
          to: 5,
          name: 'Low',
          color: '#1e84c4'
        }, {
          from: 6,
          to: 20,
          name: 'Medium',
          color: '#ed5565'
        }, {
          from: 21,
          to: 45,
          name: 'High',
          color: '#f9b931'
        }, {
          from: 46,
          to: 55,
          name: 'Extreme',
          color: '#1bb394'
        }]
      }
    }
  },
  dataLabels: {
    enabled: false
  },
  series: [{
    name: 'Jan',
    data: generateData(20, {
      min: -30,
      max: 55
    })
  }, {
    name: 'Feb',
    data: generateData(20, {
      min: -30,
      max: 55
    })
  }, {
    name: 'Mar',
    data: generateData(20, {
      min: -30,
      max: 55
    })
  }, {
    name: 'Apr',
    data: generateData(20, {
      min: -30,
      max: 55
    })
  }, {
    name: 'May',
    data: generateData(20, {
      min: -30,
      max: 55
    })
  }, {
    name: 'Jun',
    data: generateData(20, {
      min: -30,
      max: 55
    })
  }, {
    name: 'Jul',
    data: generateData(20, {
      min: -30,
      max: 55
    })
  }, {
    name: 'Aug',
    data: generateData(20, {
      min: -30,
      max: 55
    })
  }, {
    name: 'Sep',
    data: generateData(20, {
      min: -30,
      max: 55
    })
  }]
};
export const rangeWithoutShadeOpts = {
  chart: {
    height: 380,
    type: 'heatmap',
    toolbar: {
      show: false
    }
  },
  stroke: {
    width: 0
  },
  plotOptions: {
    heatmap: {
      radius: 30,
      enableShades: false,
      colorScale: {
        ranges: [{
          from: 0,
          to: 50,
          color: '#1e84c4'
        }, {
          from: 51,
          to: 100,
          color: '#1bb394'
        }]
      }
    }
  },
  colors: ['#1e84c4', '#1bb394'],
  dataLabels: {
    enabled: true,
    style: {
      colors: ['#fff']
    }
  },
  series: [{
    name: 'Metric1',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric2',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric3',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric4',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric5',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric6',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric7',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric8',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }, {
    name: 'Metric8',
    data: generateData(20, {
      min: 0,
      max: 90
    })
  }],
  xaxis: {
    type: 'category'
  },
  grid: {
    borderColor: '#f1f3fa'
  }
};