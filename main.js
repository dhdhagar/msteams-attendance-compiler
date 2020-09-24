function getHoursMins(timeString) {
    let split1 = timeString.split(" ");
    let ampm = split1[1];
    let split2 = split1[0].split(":");
    let hours = parseInt(split2[0]);
    let minutes = parseInt(split2[1]);
    if (ampm === 'AM') {
        if (hours === 12) {
            hours = 0;
        }
    } else {
        if (hours !== 12) {
            hours += 12;
        }
    }
    return { hours, minutes };
}

function initCSV(file, resultsArray, userInputs) {
    return new Promise(function (resolve, reject) {
        readCSV(file).then((obj) => {
            analyzeCSV(obj, userInputs).then((results) => {
                console.log(results);
                resultsArray.push({
                    results: results,
                    startTime: userInputs.startTime
                });
                resolve();
            }).catch(() => {
                alert('There was an error. Please check your inputs and try again.');
                reject();
            });
        }).catch(function () {
            alert('Your browser is not compatible.');
            reject();
        });
    });
}

function readCSV(file) {
    return new Promise(function (resolve, reject) {
        if (window.FileReader) {
            // FileReader is supported
            var reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function (event) {
                let csvContent = event.target.result;
                console.log(csvContent);
                let csvOptions = {};
                if (csvContent.indexOf(`\t`) > -1) {
                    csvOptions.separator = `\t`;
                }
                let csvObjects = $.csv.toObjects(csvContent, csvOptions);
                console.log(csvObjects);
                resolve(csvObjects);
            }
        } else {
            reject();
        }
    });
}

function analyzeCSV(data, inputs) {
    return new Promise((resolve, reject) => {
        try {
            let classStartTime = new Date(data[0][`Timestamp`]);
            classStartTime.setHours(inputs.startTime.hours);
            classStartTime.setMinutes(inputs.startTime.minutes);
            let classEndTime = new Date(classStartTime);
            classEndTime.setHours(inputs.endTime.hours);
            classEndTime.setMinutes(inputs.endTime.minutes);

            let attendanceThreshold = inputs.threshold;
            console.log(classStartTime);
            console.log(classEndTime);

            let prevName = null;
            let joiningTime = null;
            let startTime = null, endTime = new Date(classEndTime);
            let duration = 0;
            let skipRecord = true;

            let resultCSV = [];

            let arrLen = data.length;

            function pushToResults() {
                duration += (endTime - startTime) / (1000 * 60);
                resultCSV.push({
                    'Name': prevName,
                    'Joining Time': joiningTime.toLocaleString(),
                    'Minutes Attended': Math.ceil(duration),
                    'Attendance': (Math.ceil(duration) >= attendanceThreshold) ? 'P' : 'A'
                });
            }

            data.forEach(function (row, idx) {
                rowFullName = row[`Full Name`];
                rowUserAction = row[`User Action`];
                rowTimestamp = row[`Timestamp`];

                if (!([`Unknown User`].includes(rowFullName))) { // Name exceptions
                    if (rowFullName !== prevName) {
                        let firstStudent = false;
                        // New student
                        if (skipRecord && prevName !== null) {
                            // First non-teacher record
                            skipRecord = false;
                            firstStudent = true;
                        }
                        if (!skipRecord) {
                            if (!firstStudent) {
                                // Store attendance for the previous student in the result
                                pushToResults();
                            }

                            // Reset values
                            endTime = new Date(classEndTime);
                            duration = 0;

                            if (rowUserAction === `Joined`) {
                                if (new Date(rowTimestamp) < new Date(classStartTime)) {
                                    joiningTime = new Date(classStartTime);
                                    startTime = new Date(classStartTime);
                                } else {
                                    joiningTime = new Date(rowTimestamp);
                                    startTime = new Date(rowTimestamp);
                                }
                                // duration = (endTime - startTime) / (1000 * 60); // In minutes
                            } else if (rowUserAction === `Joined before`) {
                                joiningTime = new Date(classStartTime);
                                startTime = new Date(classStartTime);
                                // duration = (endTime - startTime) / (1000 * 60); // In minutes
                            }
                        }
                        prevName = rowFullName;
                    } else {
                        // Same student
                        if (!skipRecord) {
                            if (rowUserAction === `Joined before`) {
                                joiningTime = new Date(classStartTime);
                                startTime = new Date(classStartTime);
                                endTime = new Date(classEndTime);
                                // duration = (endTime - startTime) / (1000 * 60); // In minutes
                            } else if (rowUserAction === `Left`) {
                                if (new Date(rowTimestamp) < joiningTime) {
                                    // duration = 0;
                                    endTime = new Date(joiningTime);
                                } else {
                                    endTime = new Date(rowTimestamp);
                                }
                            } else if (rowUserAction === `Joined`) {
                                if (new Date(rowTimestamp) < new Date(classStartTime)) {
                                    endTime = new Date(classEndTime);
                                } else {
                                    duration += (endTime - startTime) / (1000 * 60)
                                    startTime = new Date(rowTimestamp);
                                    endTime = new Date(classEndTime);
                                }
                            }
                        }
                    }

                    if (idx === (arrLen - 1)) {
                        // Last row
                        pushToResults();
                    }
                }
            });
            resolve(resultCSV);
        } catch (err) {
            reject();
        }
    });
}

function downloadCSV(resultsArray, studentNames) {
    if (resultsArray.length <= 0) {
        alert('There was an error. Please check your inputs and try again.');
        return;
    }
    if (resultsArray.length == 1) {
        let obj = resultsArray[0].results;
        let startTime = resultsArray[0].startTime;
        let csvContent = $.csv.fromObjects(obj);
        let csvResult = "data:text/csv;charset=utf-8," + csvContent;
        let classDateTime = new Date(obj[0][`Joining Time`]);
        let fileName = `Attendance ${classDateTime.getDate()}-${classDateTime.getMonth() + 1}-${classDateTime.getFullYear()} ${startTime.hours}${startTime.minutes}.csv`;
        encodedUri = encodeURI(csvResult);
        let link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
    } else {
        let zip = new JSZip();
        let classDates = [];
        resultsArray.forEach(el => {
            let obj = el.results;
            let startTime = el.startTime;
            let csvContent = $.csv.fromObjects(obj);
            let classDateTime = new Date(obj[0][`Joining Time`]);
            let classDateTimeStr = `${classDateTime.getDate()}-${classDateTime.getMonth() + 1}-${classDateTime.getFullYear()} ${startTime.hours}${startTime.minutes}`;
            let fileName = `Attendance ${classDateTimeStr}.csv`;

            zip.file(fileName, csvContent);

            if (studentNames !== null) {
                classDates.push(classDateTime);
                let dateKey = classDateTimeStr.split(' ')[0];
                $.each(studentNames, (k, v) => {
                    v[dateKey] = 'A'; // Initialize attendance with 'Absent'
                });
                obj.forEach((o) => {
                    if (o[`Name`] in studentNames) {
                        studentNames[o[`Name`]][dateKey] = o[`Attendance`];
                    }
                })
            }
        });
        if (studentNames !== null) {
            classDates.sort((a, b) => {
                return a - b;
            });
            classDates = $.map(classDates, (v) => {
                return `${v.getDate()}-${v.getMonth() + 1}-${v.getFullYear()}`
            });
            let sortedStudents = [];
            Object.keys(studentNames).sort().forEach((k) => {
                let student = {
                    'Name': k
                }
                classDates.forEach((v) => {
                    student[v] = studentNames[k][v];
                });
                sortedStudents.push(student);
            });
            let csvContent = $.csv.fromObjects(sortedStudents);
            let fileName = `Aggregated Attendance ${classDates[0]} ${classDates[classDates.length - 1]}.csv`;
            zip.file(fileName, csvContent);
        }
        zip.generateAsync({ type: "base64" }).then(function (content) {
            let link = document.createElement("a");
            link.setAttribute("href", `data:application/zip;base64,${content}`);
            link.setAttribute("download", 'msteams-attendance.zip');
            document.body.appendChild(link);
            link.click();
        });
    }
}

$(document).ready(function () {
    let defaultStartTime = '8:30';
    let defaultEndTime = '9:30';
    let defaultThreshold = 50;
    let studentNames = null;

    let timepickerOptions = {
        timeFormat: 'h:mm p',
        interval: 15,
        dropdown: true,
        dynamic: false,
        scrollbar: true
    };

    $("#startTimePicker").timepicker(Object.assign({}, timepickerOptions, {
        defaultTime: defaultStartTime,
        startTime: defaultStartTime
    }));
    $("#endTimePicker").timepicker(Object.assign({}, timepickerOptions, {
        defaultTime: defaultEndTime,
        startTime: defaultEndTime
    }));
    $("#thresholdPicker").val(defaultThreshold);

    $('#dropZone').click(function () { $('#csvFile').trigger('click'); });

    $("#csvFile").on('change', function (data) {
        console.log('csvFileChange');
        console.log(data);
        let files = $(data.target)[0].files;
        if (files.length === 0) {
            alert('Upload error. No files detected.')
        } else {
            let userInputs = {
                startTime: getHoursMins($("#startTimePicker").val()),
                endTime: getHoursMins($("#endTimePicker").val()),
                threshold: $("#thresholdPicker").val()
            }
            let classDuration = (userInputs.endTime.hours * 60 + userInputs.endTime.minutes) - (userInputs.startTime.hours * 60 + userInputs.startTime.minutes);
            if (classDuration <= 0) {
                alert('Configuration error. The End Time must be greater than the Start Time.')
            } else if (userInputs.threshold > classDuration) {
                alert('Configuration error. The Attendance Requirement cannot be greater than the class duration.')
            } else {
                resultsArray = [];
                filePromises = [];
                Array.from(files).forEach(file => {
                    console.log(file);
                    let fileName = file.name.split(`.`);
                    if (fileName[fileName.length - 1] === `csv`) {
                        filePromises.push(initCSV(file, resultsArray, userInputs));
                    }
                });
                if (filePromises.length > 0) {
                    Promise.all(filePromises).then(() => {
                        downloadCSV(resultsArray, studentNames);
                    });
                } else {
                    alert('There was an error. Please check your inputs and try again.')
                }
            }
        }
        $("#csvFile").val("");
    });

    $("#nameFile").on('change', function (data) {
        console.log('nameFileChange');
        console.log(data);
        let file = $(data.target)[0].files[0];
        console.log(file);
        let fileName = file.name.split(`.`);
        if (fileName[fileName.length - 1] === `csv`) {
            readCSV(file).then((data) => {
                if (data.length > 0) {
                    studentNames = {};
                    data.forEach((v) => {
                        studentNames[v[`Name`]] = {};
                    });
                } else {
                    alert('There was an error in the uploaded file. Please check your inputs and try again.')
                }
            })
        } else {
            alert('The uploaded file is not a CSV. Please check your inputs and try again.')
            $("#clearNameFile").click();
        }
    });

    $("#clearNameFile").click(() => {
        studentNames = null;
        $("#nameFileForm").trigger("reset");
    });
});
