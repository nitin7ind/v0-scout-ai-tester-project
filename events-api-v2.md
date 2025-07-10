# Events API V2

> **Note**: This documentation describes the Wobot Events API V2 that is integrated with the ScoutAI Playground. This API is used as one of the data sources for image analysis in the Scout AI application.

When using Wobot AI, you might want to export and use the events in your own analytics or logging platforms. The Events API allows you to fetch Task Events on demand.

The API is designed to be simple yet flexible, allowing you to export your data in an efficient and streamlined manner.

# Authentication

All Wobot API requests require authentication via an API key. You can get your account’s API key from `Settings > Integration > API Integration`. To authenticate, include your API key in the Authorization header of your requests:

```javascript
Authorization: Bearer YOUR_API_KEY
```


:::info
Replace YOUR_API_KEY with your actual API key.

:::

# Environments

Wobot provides two separate environments for API integration:

* **Staging**: For testing and development
* **Production**: For live operations

Depending on your current mode of operation, you can use the base URL for each environment:

* **Staging Base URL**:

  `https://api-staging.wobot.ai`

  **Production Base URL**:

  `https://api.wobot.ai`

# API Endpoints

All API endpoints are relative to the base URL: [https://api.wobot.ai/client/v2/](https://api-app-prod.wobot.ai/client/v1/)

[Learn more about Different APIs & their data](https://pitch.com/v/wobot-ai-documentation-dec-2024-3wg964)


## 1. DriveThru Journey

`GET /drivethru/journey/get/:limit/:page`

Retrieve DriveThru journey data based on the provided parameters.

#### **Parameters**

| Name | Type | Description | Required |
|----|----|----|----|
| limit | number | Number of documents per page | Yes |
| page | number | page number | Yes |

#### **Header**

| Name | Type | Description | Format | Required |
|----|----|----|----|----|
| tz | string | Timezone to fetch the data. (Default UTC) | America/Detroit | No |

#### **Query Parameters**

| Name | Type | Description | Format | Required |
|----|----|----|----|----|
| location | string | Location Id to fetch the data for | Alphanumeric string | No |
| from | string | The date or datetime from which data should be fetched.\ne.g. 2024-03-29T01:29:24.464Z | `YYYY-MM-DD`\nOR\n`YYYY-MM-DDTHH:MM:SS.sssZ` | Yes |
| to | string | To Date | `YYYY-MM-DD`\nOR\n`YYYY-MM-DDTHH:MM:SS.sssZ` | Yes |

#### **Example Request**

```bash
GET https://api.wobot.ai/client/v2/drivethru/journey/get/10/0?location=653f73a7366366cb97e04be4&from=2024-06-11&to=2024-06-13
```

#### **Response Parameters Description**

| Name | Description |
|----|----|
| lp | License plate if enabled in setup and if detected on the camera (depends on camera view) |
| lpr |    |
| lprConfidence |    |
| confidenceScore | The confidence level of the event |
| type | If the detection is of car entrying the station or exiting. Values: “entry” / “exit”. |
| journey | Id stored for the car. Values: string or null. |
| metadata | Additional metadata associated with the event including region, city, location, etc |
| locationId | Stores the Site ID field which can be used for integrations.  |
| boundingBox | Normalized coordinates to draw a area / bound box around the car. To be used along with with the image. |
| orderNo | The order of the station in the DriveThru Journey. e.g. Menu can have value as 1, Window as 2 as per the setup. |
| primary | If the station is the primary station of the DriveThru. This can be used to calculate the focused metrics. |
| halt | Whether the car is expected to stop at the station or pass through (checkpoint). Value: true / false. |
| goal | The target time in seconds the car should stop at this station. |
| station | The exact area of DriveThru where detections are done. Supports lane based areas. e.g. Window A, Menu A, Menu B, etc. |
| stationType | Overall blocks of the DriveThru layouts. e.g. Window, Menu, etc. |
| shift | Daypart for which the car was detected. Can be customized. |
| isCompleted | Whether the car was seen across all the stations present in the DriveThru |
| time | The timestamp at which detection happened. |
| createdAt | The timestamp when the event was saved in the database. |

#### **Sample Response**

The following response covers the different scenarios of a Y lane DriveThru setup with 2 Menus and 1 Window.

```javascript
{
    "status": 200,
    "message": "Journey List",
    "data": {
        "limit": 1,
        "page": 0,
        "totalPages": 1580,
        "hasNextPage": true,
        "total": 1580,
        "data": [
            {
                "_id": "66684b219a89cbec3d1e4cea",
                "location": "653f73a7366366cb97e04be4",
                "city": "653f73a7366366cb97e04be1",
                "region": "653f73a7366366cb97e04bde",
                "lp": "car-061124-1",
                "confidenceScore": 0,
                "isCompleted": true,
                "goal": 100,
                "totalJourneyTime": 65,
                "timezone": "America/Chicago",
                "shift": null,
                "verifiedBy": null,
                "lpr": "JBD-8693",
                "lprConfidence": 0.9789,
                "stations": [
                    {
                        "entryCamera": "660a8a20b5f2f5b3276dce4d",
                        "exitCamera": "660a8a20b5f2f5b3276dce4d",
                        "station": "653fa3460e8b27cba7186483",
                        "stationType": "653fa2e40e8b27cba7185a16",
                        "entryImage": "https://production-app-output-gcp.wobot.ai/goodwill-northern-illinois/drive-thru/kruetzer-road-28/660a8a20b5f2f5b3276dce4d/S0L0C0_1718110830_ENTRY_1_796_307_1113_596.jpg",
                        "entryBoundingBox": [
                            [
                                0.621875,
                                0.4263888888888889
                            ],
                            [
                                0.86953125,
                                0.4263888888888889
                            ],
                            [
                                0.86953125,
                                0.8277777777777777
                            ],
                            [
                                0.621875,
                                0.8277777777777777
                            ]
                        ],
                        "exitImage": "https://production-app-output-gcp.wobot.ai/goodwill-northern-illinois/drive-thru/kruetzer-road-28/660a8a20b5f2f5b3276dce4d/S0L0C0_1718110894_EXIT_1_988_211_1110_329.jpg",
                        "exitBoundingBox": [
                            [
                                0.771875,
                                0.29305555555555557
                            ],
                            [
                                0.8671875,
                                0.29305555555555557
                            ],
                            [
                                0.8671875,
                                0.45694444444444443
                            ],
                            [
                                0.771875,
                                0.45694444444444443
                            ]
                        ],
                        "duration": 65,
                        "transitTime": 0,
                        "orderNo": 1,
                        "entryTime": "2024-06-11T13:00:30.000Z",
                        "exitTime": "2024-06-11T13:01:35.000Z",
                        "primary": false,
                        "halt": true,
                        "goal": 100
                    }
                ],
                "journeyId": "66684b182f7a1fde342f40e4",
                "metadata": {
                    "location": "Kruetzer Road 28",
                    "city": "Huntley",
                    "region": "Illinois"
                },
                "date": "2024-06-11T13:00:30.463Z",
                "dateToString": "2024-06-11",
                "created_at": "2024-06-11T13:03:29.690Z",
                "updated_at": "2024-06-11T13:03:29.690Z"
            }
        ]
    }
}
```

## 2. DriveThru Detection

`GET /drivethru/detections/get/:limit/:page`

Retrieve DriveThru journey data based on the provided parameters.

#### **Parameters**

| Name | Type | Description | Required |
|----|----|----|----|
| limit | number | Number of documents per page | Yes |
| page | number | page number | Yes |

#### **Header**

| Name | Type | Description | Format | Required |
|----|----|----|----|----|
| tz | string | Timezone to fetch the data. (Default UTC) | America/Detroit | No |

#### **Query Parameters**

| Name | Type | Description | Format | Required |
|----|----|----|----|----|
| location | string | Location Id to fetch the data for | Alphanumeric string | No |
| from | string | The date or datetime from which data should be fetched.\ne.g. 2024-03-29T01:29:24.464Z | `YYYY-MM-DD`\nOR\n`YYYY-MM-DDTHH:MM:SS.sssZ` | Yes |
| to | string | To Date | `YYYY-MM-DD`\nOR\n`YYYY-MM-DDTHH:MM:SS.sssZ` | Yes |

#### **Example Request**

```bash
GET https://api.wobot.ai/client/v2/drivethru/detections/get/10/0?location=6632196f252c390d9f84d99d&from=2024-03-21T01:29:24.464Z&to=2024-03-29T01:29:24.464Z
```

#### **Response Parameters Description**

| Name | Description |
|----|----|
| lp | License plate if enabled in setup and if detected on the camera (depends on camera view) |
| lpr |    |
| lprConfidence |    |
| confidenceScore | The confidence level of the event |
| type | If the detection is of car entrying the station or exiting. Values: “entry” / “exit”. |
| journey | Id stored for the car. Values: string or null. |
| metadata | Additional metadata associated with the event including region, city, location, etc |
| location | Stores the Site ID field which can be used for integrations.  |
| boundingBox | Normalized coordinates to draw a area / bound box around the car. To be used along with with the image. |
| orderNo | The order of the station in the DriveThru Journey. e.g. Menu can have value as 1, Window as 2 as per the setup. |
| primary | If the station is the primary station of the DriveThru. This can be used to calculate the focused metrics. |
| halt | Whether the car is expected to stop at the station or pass through (checkpoint). Value: true / false. |
| goal | The target time in seconds the car should stop at this station. |
| station | The exact area of DriveThru where detections are done. Supports lane based areas. e.g. Window A, Menu A, Menu B, etc. |
| stationType | Overall blocks of the DriveThru layouts. e.g. Window, Menu, etc. |
| time | The timestamp at which detection happened. |
| createdAt | The timestamp when the event was saved in the database. |
| uid | Detection Unique ID |
| image | An image of the detection. |
| timezone | Timezone of the location |
| camera | Camera Id of the detection |
| dateToString | The timestamp according to location’s timezone. |

#### **Sample Response**

```javascript
{
    "status": 200,
    "message": "Detection List",
    "data": {
        "limit": 1,
        "page": 0,
        "totalPages": 107692,
        "hasNextPage": true,
        "total": 107692,
        "data": [
            {
                "_id": "66a1486ca4e591e8e85e2f39",
                "type": "entry",
                "location": "6632196f252c390d9f84d99d",
                "city": "6632196f252c390d9f84d99a",
                "region": "653f73a7366366cb97e04bde",
                "lp": "car-072424-30",
                "station": "Donation",
                "stationType": "Donation",
                "confidenceScore": 0,
                "image": "https://production-app-output-gcp.wobot.ai/goodwill-northern-illinois/drive-thru/s-annie-glidden-rd-25/66321c1b4313490dd3ee499a/S0L0C0_1721845634_ENTRY_3_918_23_1060_156.jpg",
                "uid": "",
                "lpr": "JBD-8693",
                "lprConfidence": 0.9789,
                "boundingBox": [
                    [
                        0.7171875,
                        0.03194444444444444
                    ],
                    [
                        0.828125,
                        0.03194444444444444
                    ],
                    [
                        0.828125,
                        0.21666666666666667
                    ],
                    [
                        0.7171875,
                        0.21666666666666667
                    ]
                ],
                "timezone": "America/Chicago",
                "orderNo": 1,
                "camera": "66321c1b4313490dd3ee499a",
                "time": "2024-07-24T18:27:14.000Z",
                "metadata": {
                    "station": "Donation",
                    "stationType": "Donation",
                    "location": "S Annie Glidden Rd 25",
                    "city": "DeKalb",
                    "region": "Illinois"
                },
                "primary": false,
                "halt": true,
                "goal": 90,
                "dateToString": "2024-07-24",
                "created_at": "2024-07-24T18:31:08.551Z",
                "updated_at": "2024-07-24T18:31:08.551Z",
                "journey": "66a1485e04d00e2d7be459a3"
            }
        ]
    }
}
```


## 3. Tasks Events Data

`GET /events/get/:limit/:page`

Retrieve analytics events data based on the provided parameters.

#### **Parameters**

| Name | Type | Description | Required |
|----|----|----|----|
| limit | number | Number of documents per page | Yes |
| page | number | page number | Yes |

#### **Query Parameters**

| Name | Type | Description | Format | Required |
|----|----|----|----|----|
| location | string | Location Id to fetch the data for | Alphanumeric string | No |
| task   | string | Task Id to fetch the data for | Alphanumeric string | No |
| camera | string | Camera Id to fetch the data for | Alphanumeric string | No |
| from | string | From Date | `YYYY-MM-DD` | Yes |
| to | string | To Date | `YYYY-MM-DD` | Yes |

#### **Example Request**

```bash
GET https://api.wobot.ai/client/v2/events/get/10/0?location=606ab42211f9d5f6851921b0&task=606ab42211f9d5f6851921ae&from=2023-03-01&to=2023-03-30
```

#### **Example Time Based Task Response**

```json
{
    "message": "",
    "data": {
        "page": 0,
        "limit": 10,
        "totalPages": 1,
        "hasNextPage": true,
        "total": 1,
        "data": [
            {
                "_id": "641be5668ca04f729cfb2392",
                "title": "Customer wait time",
                "confidence": "high",
                "additionalInfo": "",
                "image": "https://wobotstagingoutputblob1.azureedge.net/wobot-stage-common-output-blob-1/tini-045/human-intelligence/bandra/hijab-compliance/vehicle-use-case/images/026390f8-354c-43d6-8f9c-fadfc180966b.jpg?sv=2021-06-08&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2030-01-03T22:17:04Z&st=2023-01-03T14:17:04Z&spr=https&sig=H4d3QJHg%2FdIEIKJuw%2F%2B2csQp5s7TLTIyNEUmUewcGfI%3D",
                "video": "https://wobotwocamstaging.azureedge.net/wobot-stag-common-input-blob-1/tini-045/maharastra/mumbai/bandra/vehicle-use-case/motion-recording/20-03-2023/45-63f301854b3b9d4e93ef6f99-mr_2023-03-20T11:26:33.245Z.mp4?sv=2021-06-08&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2030-01-03T15:31:07Z&st=2023-01-03T07:31:07Z&spr=https&sig=%2F%2FTBhtsYeC8YZVb5AJCm0AHjsjo5NOYxrV2H%2F1XMdWE%3D",
                "incidentInfo": [{
                        "key": "wait-time",
                        "label": "Wait Time",
                        "rawValue": 60,
                        "value": "1 min",
                        "icon": "https://wobot-prod-application.s3.amazonaws.com/static/egYgxzk9kj-YwL9i.svg"
                    }],
                "camera": {
                    "_id": "63f301854b3b9d4e93ef6f99",
                    "camera": "Camera 1 Billing Counter"
                },
                "task": "60f558ce327eef28e80527a1",
                "modelType": {
                    "type": "time-based",
                    "label": "Time based",
                },
                "metadata": {
                    "region": "California",
                    "city": "Foster City",
                    "location": "Forrestal Lane 1561",
                    "task": "Customer Wait Time"
                    "locationId": "1561"
                },
                "createdAt": "2023-03-31T01:00:22.314Z",
                "detectedAt": "2023-03-31T01:00:22.314Z",
                "date": "2023-03-20",
                "taskTime": "2023-03-20T11:26:33.245Z",
                "optimalRange": {min: 30, max: 180, operator: "Is between"},
                "label": "In-Range"        // Above|Below|In-Range
            },
        ]
    }
}
```

#### **Example  Count Based Task Response**

```javascript
{
    "message": "",
    "data": {
        "page": 0,
        "limit": 1,
        "totalPages": 1116,
        "hasNextPage": true,
        "total": 1116,
        "data": [
            {
                "_id": "642630a601aa7db2a180f92b",
                "timezone": "America/Tijuana",
                "title": "Customer Walk-In Count",
                "raisedFrom": "Artificial Intelligence",
                "timestamp": "",
                "confidence": "unknown",
                "additionalInfo": "",
                "image": "https://wobotprodoutput.azureedge.net/wobot-prod-common-output-blob/openeye/artificial-intelligence/pawpular-companions/w-0057/pos-1/snaps/W0057_31_03_2023__01_00_22_224.jpg?sv=2020-08-04&ss=bfqt&srt=sco&sp=rwdlacupitfx&se=2030-01-24T16:21:21Z&st=2022-01-24T08:21:21Z&spr=https&sig=9Q3xoKjSk2BceNKH53kBsOQqI77WIUdRtBvCoMae5zk%3D",
                "video": "",
                "incidentInfo": [
                    {
                        "key": "person_count",
                        "label": "person count",
                        "icon": "https://wobot-prod-application.s3.amazonaws.com/static/egYgxzk9kj-YwL9i.svg",
                        "value": 0,
                        "areaName": "Zone 1"
                    }
                ],
                "personDetected": [],
                "camera": {
                    "_id": "640a5a8294d7d72562e429a4",
                    "camera": "POS 1"
                },
                "task": "63d122d72f16c761207bd21a",
                "taskType": "Artificial Intelligence",
                "modelType": {
                    "type": "count-based",
                    "label": "Count based",
                    "_id": "6419c18a2bce4a41f0bcca1f"
                },
                "uid": "c8baf58c-31a2-4d02-94e8-46128017aad1",
                "raisedBy": null,
                "metadata": {
                    "_id": "642630a601aa7db2a180f92d",
                    "region": "US",
                    "city": "Liberty Lake",
                    "location": "Forrestal Lane 1561",
                    "locationId": "1561",
                    "task": "Customer Walk-in Count Pawpular",
                    "checklist": "Customer Walk-in Checklist for Food Services"
                },
                "taskTime": "2023-03-31T01:00:22.314Z",
                "createdAt": "2023-03-31T01:00:22.314Z",
                "detectedAt": "2023-03-31T01:00:22.314Z",
                "__v": 0,
                "date": "2023-03-30",
                "optimalRange": null,
                "label": ""
            }
        ]
    },
    "status": 200
}
```

#### **Example  Process Based Task Response**

```javascript
{
    "message": "",
    "data": {
        "page": 0,
        "limit": 1,
        "totalPages": 181,
        "hasNextPage": true,
        "total": 181,
        "data": [
            {
                "_id": "642622af3865e4b2ae3476b5",
                "timezone": "America/Tijuana",
                "title": "Heatmap Generated",
                "raisedFrom": "Artificial Intelligence",
                "timestamp": "",
                "confidence": "unknown",
                "additionalInfo": "",
                "image": "image_url",
                "video": "",
                "incidentInfo": [],
                "camera": {
                    "_id": "64012843975da6a9bb3546fc",
                    "camera": "OpenEye OE-C3011D4-1 (83b0c)"
                },
                "task": "63ea7b59f1853bba1e41cb0c",
                "taskType": "Artificial Intelligence",
                "modelType": {
                    "type": "process-based",
                    "label": "Process based",
                    "_id": "64266fcca7960aad21667cd8"
                },
                "uid": "4008833c-91e6-49b7-841d-593304d5aa81",
                "personDetected": [],
                "raisedBy": null,
                "metadata": {
                    "_id": "642622af3865e4b2ae3476b7",
                    "region": "US",
                    "city": "Liberty Lake",
                    "location": "Forrestal Lane 1561",
                    "locationId": "1561"
                    "task": "Zone-Based Heatmaps",
                    "checklist": "Customer Engagement Checklist for Retail",
                },
                "createdAt": "2023-03-31T01:00:22.314Z",
                "detectedAt": "2023-03-31T01:00:22.314Z",
                "__v": 0,
                "date": "2023-03-30",
                "taskTime": "2023-03-31T00:00:47.588Z",
                "optimalRange": null,
                "label": ""
            }
        ]
    },
    "status": 200
}
```


**Response Parameters Description**

| Name | Description |
|----|----|
| confidence | The confidence level of the event |
| incidentInfo | An array of incident information, which includes details such as the key, label, raw value, value, and icon |
| camera | The ID and name of the camera associated with the event |
| modelType | The type and label of the model used for the event |
| metadata | Additional metadata associated with the event including region, city, location, task, checklist, and schedule |
| createdAt | The timestamp when the event was created in the database |
| date | The date associated with the event |
| optimalRange | The optimal range for the event, including the minimum and maximum values and the operator |
| label | The label indicating whether the event is above, below, or within the optimal range |
| raisedBy | WoPipe field to identify the user during simulation |
| detectedAt | The timestamp at which the event was detected by the system |
| personDetected | Info to identify the users in case of face detection |

## 4. Locations List

`GET /locations/get`

Retrieve a list of all locations with their IDs. An array of locations is returned

#### Query Parameters

| Name | Type | Description | Format | Required |
|----|----|----|----|----|
| task | string | Task Id to fetch the data for | Alphanumeric string | No |

#### **Example Request**

```javascript
GET https://api.wobot.ai/client/v2/locations/get?task=6541d5a3b240edabfe00c949
```

#### **Example Response**

```json
{
    "message": "",
    "data": [
        {
            "_id": "653f73a7366366cb97e04be4",
            "area": "Kruetzer Road 28",
            "type": "location",
            "timezone": "America/Chicago",
            "created_at": "2023-10-30T09:13:11.702Z",
            "updated_at": "2023-11-04T18:47:53.120Z",
            "locationId": "28",
            "city": {
                "area": "Huntley",
                "_id": "653f73a7366366cb97e04be1"
            },
            "region": {
                "area": "Illinois",
                "_id": "653f73a7366366cb97e04bde"
            }
        },
        {
            "_id": "65dfaaf89f732afdf72d0677",
            "area": "Central Park Drive 29",
            "type": "location",
            "timezone": "America/Chicago",
            "created_at": "2024-02-28T21:51:52.907Z",
            "updated_at": "2024-02-28T21:51:52.907Z",
            "locationId": "29",
            "city": {
                "area": "Crystal Lake",
                "_id": "65dfaaf89f732afdf72d0674"
            },
            "region": {
                "area": "Illinois",
                "_id": "653f73a7366366cb97e04bde"
            }
        },
        {
            "_id": "660a892717747db319600b51",
            "area": "Algonquin Road 30",
            "type": "location",
            "timezone": "America/Chicago",
            "created_at": "2024-04-01T10:15:03.480Z",
            "updated_at": "2024-04-01T10:15:03.480Z",
            "locationId": "30",
            "city": {
                "area": "Algonquin",
                "_id": "660a892717747db319600b4e"
            },
            "region": {
                "area": "Illinois",
                "_id": "653f73a7366366cb97e04bde"
            }
        },
        {
            "_id": "660e81d76540c0ff031588fb",
            "area": "N Richmond Road 27",
            "type": "location",
            "timezone": "America/Chicago",
            "created_at": "2024-04-04T10:32:55.050Z",
            "updated_at": "2024-04-04T10:32:55.050Z",
            "locationId": "27",
            "city": {
                "area": "McHenry",
                "_id": "660e81d76540c0ff031588f8"
            },
            "region": {
                "area": "Illinois",
                "_id": "653f73a7366366cb97e04bde"
            }
        },
        {
            "_id": "663219358dcf570dc45eba89",
            "area": "N 2nd Street 24",
            "type": "location",
            "timezone": "America/Chicago",
            "created_at": "2024-05-01T10:28:05.125Z",
            "updated_at": "2024-05-01T10:28:05.125Z",
            "locationId": "24",
            "city": {
                "area": "Machesney Park",
                "_id": "663219358dcf570dc45eba86"
            },
            "region": {
                "area": "Illinois",
                "_id": "653f73a7366366cb97e04bde"
            }
        },
        {
            "_id": "6632194f741f740d914e5339",
            "area": "West Stevenson Rd 26",
            "type": "location",
            "timezone": "America/Chicago",
            "created_at": "2024-05-01T10:28:31.823Z",
            "updated_at": "2024-05-01T10:28:31.823Z",
            "locationId": "26",
            "city": {
                "area": "Ottawa",
                "_id": "6632194f741f740d914e5336"
            },
            "region": {
                "area": "Illinois",
                "_id": "653f73a7366366cb97e04bde"
            }
        },
        {
            "_id": "6632196f252c390d9f84d99d",
            "area": "S Annie Glidden Rd 25",
            "type": "location",
            "timezone": "America/Chicago",
            "created_at": "2024-05-01T10:29:03.020Z",
            "updated_at": "2024-05-01T10:29:03.020Z",
            "locationId": "25",
            "city": {
                "area": "DeKalb",
                "_id": "6632196f252c390d9f84d99a"
            },
            "region": {
                "area": "Illinois",
                "_id": "653f73a7366366cb97e04bde"
            }
        },
        {
            "_id": "6633628fea111a1ba8d7e032",
            "area": "McFarland Road 32",
            "type": "location",
            "timezone": "America/Chicago",
            "created_at": "2024-05-02T09:53:19.825Z",
            "updated_at": "2024-05-02T09:53:19.825Z",
            "locationId": "32",
            "city": {
                "area": "Rockford",
                "_id": "6633628fea111a1ba8d7e02f"
            },
            "region": {
                "area": "Illinois",
                "_id": "653f73a7366366cb97e04bde"
            }
        },
        {
            "_id": "6633647d01f06d1b95682dc3",
            "area": "East 4th Street 22",
            "type": "location",
            "timezone": "America/Chicago",
            "created_at": "2024-05-02T10:01:33.017Z",
            "updated_at": "2024-05-02T10:01:33.017Z",
            "locationId": "22",
            "city": {
                "area": "Sterling",
                "_id": "6633647d01f06d1b95682dc0"
            },
            "region": {
                "area": "Illinois",
                "_id": "653f73a7366366cb97e04bde"
            }
        },
        {
            "_id": "6639e6ff8593741f25892b71",
            "area": "E State St 20",
            "type": "location",
            "timezone": "America/Chicago",
            "created_at": "2024-05-07T08:31:59.390Z",
            "updated_at": "2024-05-07T08:31:59.390Z",
            "locationId": "20",
            "city": {
                "area": "Rockford",
                "_id": "6633628fea111a1ba8d7e02f"
            },
            "region": {
                "area": "Illinois",
                "_id": "653f73a7366366cb97e04bde"
            }
        }
    ],
    "status": 200
}
```

## 5. Tasks List

`GET /task/list`

Retrieve a list of all tasks with their IDs.

#### Query Parameters

| Name | Type | Description | Format | Required |
|----|----|----|----|----|
| location | string | Location Id to fetch the data for | Alphanumeric string | No |

#### **Example Request**

```json
GET https://api-app-prod.wobot.ai/client/v2/task/list?location=65dfaaf89f732afdf72d0677
```

#### **Example Response**

```json
{
    "message": "",
    "data": [
        {
            "location": [
                {
                    "_id": "65dfaaf89f732afdf72d0677",
                    "area": "Central Park Drive 29"
                }
            ],
            "task": "Vehicle Not Detected: More than x Minutes",
            "_id": "6541d5a3b240edabfe00c949"
        }
    ],
    "status": 200
}
```


## 6. Camera List

`GET /camera/get`

Retrieve a list of all cameras with their IDs.

#### Query Parameters

| Name | Type | Description | Format | Required |
|----|----|----|----|----|
| location | string | Location Id to fetch the data for | Alphanumeric string | No |
| task | string | Task Id to fetch the data for | Alphanumeric string | No |

#### **Example Request**

```json
GET https://api.wobot.ai/client/v2/camera/get?location=653f73a7366366cb97e04be4&task=6541d5a3b240edabfe00c949
```

#### Example Response

```bash
{
    "message": "",
    "data": {
        "total": 1,
        "data": [
            {
                "_id": "660a8a20b5f2f5b3276dce4d",
                "camera": "Donation Drive New",
                "status": "Active"
            }
        ]
    },
    "status": 200
}
```

# Example Error Response

If there is an issue with your API request, Wobot will return an error with a descriptive message. Errors are returned with HTTP status codes in the 4xx range for client errors and 5xx range for server errors.

```json
{
    "status": 401,
    "message": "Failed to authenticate",
    "data": {}
}
```

#### **Common Error Codes:**

* **400 Bad Request:** The request was malformed or invalid. Check your parameters and try again.
* **401 Unauthorized:** Your API key is missing or incorrect. Check your Authorization header.
* **403 Forbidden:** You don't have the necessary permissions to access the requested resource.
* **404 Not Found:** The requested resource could not be found. Check your endpoint and parameters.
* **422 Unprocessable Entity:** The request is well-formed, but contains semantic errors. Check your parameters for correctness.
* **429 Too Many Requests:** You have exceeded the rate limit for the API. Slow down your requests.
* **500 Internal Server Error:** An error occurred on Wobot's end. If the issue persists, contact Wobot support.

# Rate Limits

To maintain a high quality of service, Wobot enforces rate limits on API requests. The default rate limit is 60 requests per minute. If you exceed the rate limit, Wobot will return a 429 Too Many Requests error. You can request an increase in your rate limit by contacting Wobot support.

# Support

If you have any questions or need assistance, please feel free to reach out to our support team at [support@wobot.](mailto:support@gobot.com)ai. We're here to help you get the most out of Wobot's Data Out API.

*Happy coding!*