Contacts Search API
Please note: Due to the complexity of the advanced filtering requirements, updates may take a few seconds to appear in the search
results.
The Contacts Search API enables users to search for contacts within your CRM system based on specified criteria. It oﬀers extensive filtering,
sorting, and pagination options to refine search results according to specific needs.
Endpoint: POST /contacts/search
🔸 Request Body
Parameter Type Required Description Example
locationId page string Yes Location ID in which the search needs to be performed. 5DP41231LkQsiKESj6rh
number No The page number of results to retrieve. Used for standard pagination. 1
⚠ Note : When using searchAfter parameter , page should not be
provided.
pageLimit searchAfter number Yes The number of results to limit per page. 20
array No Used for cursor-based pagination. This value is returned in the response
of each document and defines where to start the next page from.
[10, "ABC"]
⚠ Note : Required for retrieving results beyond 10,000 records.
filters array No
|---- group Logical group operator for the filters. Must be either AND or OR .
|---- filters Array of filters or nested filter groups to be grouped together .
|---- field Name of the field to filter by.
|----
operator
Operator to apply for filtering.
|---- value Value for the filter .
⚠ Note : By default every filter in the AND logical group
filters array is considered in
sort array No Array of sorting criteria to apply for ordering search results.
|---- field |----
direction
Name of the field to sort by.
Sorting direction ( asc for ascending, desc for descending).
query string No The string you want to search for within your contacts. The results will
depend on the searchable fields you’ve configured.
⚠ Note:
•
Max query limit is 75 characters
•
query runs filters / tests against the fields defined as searchable in
the Custom Fields Settings tab. These searchable fields are
customizable.
For more information on how searchable fields work for contacts, please
refer to this guide:
https://help.gohighlevel.com/support/solutions/articles/155000003913-
searching-an-object-record
Pagination Limitations
The API has the following pagination limitations:
1.
Standard Pagination (page & pageLimit)
•
Can fetch a maximum of 10,000 records in total
•
Use page and pageLimit parameters
Note:
The API with Standard Pagination supports retrieving up to 10,000 records in total, with a maximum of 500 records per request. To
access all records, use the page and pageLimit parameters to paginate through results.
For example, page=20 and pageLimit=500 will provide you the last set of result set using pagination API.
2.
Cursor-based Pagination (searchAfter & pageLimit)
•
Required for accessing more than 10,000 records
•
•
•
Use the searchAfter parameter returned in each response to fetch the next set of results
Do not include the page parameter when using searchAfter
This allows for eﬃcient pagination through large result sets
Sample Request Body
{
"locationId": "5DP41231LkQsiKESj6rh",
"page": 1,
"pageLimit": 20,
"searchAfter": ["bs5qhs78vqhs", "2FP41231LkQsiKESj6eg"],
"filters": [
{
"field": "dnd",
"operator": "eq",
"value": true
},
{
"group": "OR",
"filters": [
{
},
{
}
"field": "firstNameLowerCase",
"operator": "eq",
"value": "alex"
"field": "lastNameLowerCase",
"operator": "eq",
"value": "peter"
]
},
],
"sort": [
{
}
"field": "firstNameLowerCase",
"direction": "desc"
],
"query":"tom"
}
Filters
The Search Contacts API supports a variety of filters that allow users to refine their search results based on specific criteria. Filters can be
applied individually or grouped together using logical operators (AND, OR) to create complex search queries each comprising three essential
components:
1.
Field: Indicates the attribute or property of contacts by which the filter is applied. For example, contactName refers to the name of the
contact.
2.
Operator: Specifies the operation to be performed on the field to filter contacts. Operators define the type of comparison or matching
to be executed.
3.
Value: Represents the specific value against which the field is compared using the specified operator . This value varies based on the
filter criteria and can be a string, number , or other data type relevant to the field being filtered.
Sample Filter Payload
{
"filters": [
{
"group": "AND",
"filters": [
{
"field": "firstNameLowerCase",
"operator": "contains",
"value": "John"
},
{
"field": "email",
"operator": "exists"
}
]
},
{
"group": "OR",
"filters": [
{
"field": "city",
"operator": "eq",
"value": "New York"
},
{
"field": "state",
"operator": "eq",
"value": "California"
}
]
}
]
}
Supported Filter Operators
Operator Definition Value Type Example Character
Limit
eq Equals Number , String, Boolean 75
not
_
eq Not Equals Number , String, Boolean 75
contains Contains String (The contains operator does not
support special characters.)
75
not
_
contains Not Contains String (The not_contains operator does
not support special characters.)
75
exists Exists (has a value) Undefined
(Do not pass any value, just field and
operator are enough)
None
not
_
exists Does not exist (no
value)
Undefined
(Do not pass any value, just field and
operator are enough)
None
range Range 75
Supported Filter Fields
Display Name Field Name Supported
Operators
Example
Contact Information
Contact Id id eq
not
_
eq
Contact Name contactName eq
not
_
eq
exists
not
exists
_
Address address eq
Assigned assignedTo eq
not
_
eq
contains
not
contains
_
exists
not
exists
_
not
_
eq
exists
not
exists
_
Business Name businessName eq
City city eq
Country country eq
not
_
eq
contains
not
contains
_
exists
not
exists
_
not
_
eq
contains
not
contains
_
exists
not
exists
_
not
_
eq
exists
not
exists
_
Company Name companyName eq
Created At dateAdded range
not
_
eq
contains
not
contains
_
exists
not
exists
_
exists
not
exists
_
Updated At dateUpdated range
exists
not
exists
_
DND dnd eq
not
_
eq
exists
not
exists
_
Email email eq
not
_
eq
exists
not
exists
_
Followers followers eq
contains and
not_contains are not
yet supported
not
_
eq
exists
not
exists
_
First Name Lower Case firstNameLowerCase eq
not
_
eq
contains
not
contains
_
exists
not
exists
_
Coming soon! Coming soon! Coming soon!
First Name (Without Lower
Case)
Last Name Lower Case lastNameLowerCase eq
not
_
eq
contains
not
contains
_
exists
not
exists
_
Last Name (Without Lower
Case)
Coming soon! Coming soon! Coming soon!
Is Valid Whatsapp isValidWhatsapp eq
not
_
eq
exists
not
exists
_
Last Email Clicked Date lastEmailClickedDate range
exists
not
exists
_
Last Email Opened Date lastEmailOpenedDate range
exists
not
exists
_
Phone
(Do pass in the correct
country code)
Eg: +91701000000
phone eq
Postal Zip Code postalCode eq
Source source eq
State state eq
Tags tags eq
not
_
eq
contains
not
contains
_
exists
not
exists
_
not
_
eq
contains
not
contains
_
exists
not
exists
_
not
_
eq
contains
not
contains
_
exists
not
exists
_
not
_
eq
contains
not
contains
_
exists
not
exists
_
not
_
eq
contains
not
contains
_
exists
not
exists
_
Timezone
Eg: Pacific/Honolulu
timezone eq
Contact Type type eq
Is Valid Email
(Applicable only if Email
Validation is enabled for the
location)
validEmail eq
not
_
eq
exists
not
exists
_
not
_
eq
exists
not
exists
_
not
_
eq
exists
not
exists
_
Website website eq
not
_
eq
exists
not
exists
_
Date of Birth dateOfBirth range
contains and
not_contains are not
yet supported
exists
not
exists
_
Last Appointment -
Confirmed/Open
Contact Activity
lastAppointment range
exists
not
exist
_
Workflow (Active) activeWorkflows eq
Workflow (Finished) finishedWorkflows eq
Opportunity Information
not
_
eq
exists
not
exists
_
not
_
eq
exists
not
exists
_
field - nested
Pipeline field - opportunities
sub field - pipelineId
sub field -
eq
not
_
eq
exists
not
exists
_
field - nested
Pipeline Stage field - opportunities
sub field - pipelineStageId
sub field -
eq
not
_
eq
exists
not
exists
_
field - nested
Pipeline Status field - opportunities
sub field - status
sub field -
eq
not
_
eq
exists
not
exists
_
Opportunities Combination
Filters
You can combine 2 or more sub-fields
under opportunities nested filters
Custom Fields
•
•
•
•
•
TEXT Type Field
LARGE
_
TEXT Type Field
SINGLE
_
OPTIONS Type
Field
RADIO Type Field
PHONE Type Field
eq
not
_
eq
contains
not
contains
_
exists
not
exists
_
•
•
CHECKBOX Type Field
MULTIPLE
OPTIONS
_
Type Field
eq
not
_
eq
exists
not
exists
_
•
•
NUMERICAL Type Field
MONETORY Type Field
range
exists
not
exists
_
eq
not
_
eq
customFields. {{ custom_field_id }}
Eg: customFields.OBj007JIEmLP0IEHdV1l
•
DATE Type Field
range
exists
not
exists
_
•
TEXTBOX
_
LIST Type Field
customFields. {{ custom_field_id }}.{{
optionoption_id }}
Eg:
customFields.OBj007JIEmLP0IEHdV1l.c1b70ec9-
664f-400f-a3fc-6f7912c5e310
eq
not
_
eq
contains
not
contains
_
exists
not
exists
_
Sort
The Search Contacts API supports sorting contacts based on various fields. Users can specify the field to sort by, the sorting direction
(ascending or descending), and whether the field is a custom field.
1.
Field: Indicates the attribute or property of contacts by which the sorting is applied. For example,
"date
of
_
_
birth" represents the birth
date of the contact.
2.
3.
Direction: Specifies the sorting direction as either "asc" (ascending) or "desc" (descending).
Is Custom Field: Indicates whether the field being sorted is a custom field.
Sample Sort Payloads
Note: You can combine 2 sort at once
[
{
"field": "dateAdded",
"direction": "desc"
},
{
"field": "firstNameLowerCase",
"direction": "asc"
}
]
Supported Fields
Display Name Field Name Example
First Name (Lowercase) firstNameLowerCase
Last Name (Lowercase) lastNameLowerCase
Business Name businessName
Date Created dateAdded
Date Updated dateUpdated
Email email
DND dnd
Source source
Response Body
{
"contacts": [
{
"id": "102goXVW3lIExEQPOnd3",
"additionalEmails": ["john@example.com", "jane@example.com"],
"additionalPhones": ["123456789", "987654321"],
"address": "123 Main Street",
"assignedTo": "182goXVW3lIExEQPOnd3",
"businessId": "282goXVW3lIExEQPOnd3",
"businessName": "Acme Corporation",
"city": "New York",
"companyName": "XYZ Corp",
"country": "United States",
"customFields": [
{
"id": "sqoiOo5mAb8qwjXvcgdQ",
"value": "random",
}
{
"id": "qweqgehuqwejqeiqwoqw",
"value": ["option - 1", "option -2"],
}
],
"dateAdded": "2024-06-06T18:54:57.221Z",
"dateOfBirth": "1990-01-01",
"dateUpdated": "2024-06-06T18:54:57.221Z",
"dnd": false,
"dndSettings": {},
"email": "john@example.com",
"firstNameLowerCase": "john", // first name without lowercase is not yet available.
"lastNameLowerCase": "doe", // first name without lowercase is not yet available.
"followers": ["682goXVW3lIExEQPOnd3", "582goXVW3lIExEQPOnd3"],
"locationId": "502goXVW3lIExEQPOnd3",
"phone": "+123456789",
"phoneLabel": "Mobile",
"postalCode": "12345",
"source": "Website",
"state": "California",
"tags": ["tag-1", "tag-2"],
"type": "lead",
"validEmail": true,
"website": "www.example.com",
"attributionSource": {
"utmSource": "google",
"utmKeyword": "crm platform",
"utmTerm": "crm+tool",
"utmMatchtype": "b",
"sessionSource": "google_ads",
"medium": "paid",
"mediumId": "md_123",
"campaign": "winter_sale",
"utmMedium": "cpc",
"utmContent": "banner_1",
"gclid": "EAIaIQobChMI12",
"fbclid": "fb.12345.abc",
"campaignId": "cmp_789",
"adId": "ad_456",
"adGroupId": "adg_321",
"referrer": "https://example.com",
"fbc": "fb.1.123.456",
"fbp": "fbp.1.789.321",
"userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
"ip": "192.168.1.10",
"gaClientId": "12345.67890",
"adName": "crm_ad_set",
"gbraid": "gbraid_sample_123",
"wbraid": "wbraid_sample_456",
"url": "https://product.com/pricing",
"adSource": "google_ads"
},
"lastAttributionSource": {
"utmSource": "facebook",
"utmKeyword": "marketing automation",
"utmTerm": "automation+tool",
"utmMatchtype": "e",
"sessionSource": "facebook_ads",
"medium": "social",
"mediumId": "md_987",
"campaign": "new_year_blast",
"utmMedium": "paid_social",
"utmContent": "video_ad",
"gclid": "EAIaIQobChMI99",
"fbclid": "fb.67890.xyz",
"campaignId": "cmp_222",
"adId": "ad_999",
"adGroupId": "adg_555",
"referrer": "https://facebook.com",
"fbc": "fb.1.987.654",
"fbp": "fbp.1.555.666",
"userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
"ip": "203.0.113.15",
"gaClientId": "98765.43210",
"adName": "fb_lead_gen",
"gbraid": "gbraid_sample_789",
"wbraid": "wbraid_sample_999",
"url": "https://landingpage.com/signup",
"adSource": "facebook_ads"
}
],
}
"total": 120
}