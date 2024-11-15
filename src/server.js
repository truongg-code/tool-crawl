const express = require("express");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 8081;

app.get("/shopee-ratings", (req, res) => {
  const options = {
    hostname: "shopee.vn",
    path: "/api/v2/item/get_ratings?exclude_filter=1&filter=0&filter_size=0&flag=1&fold_filter=0&itemid=26958015084&limit=6&offset=0&relevant_reviews=false&request_source=2&shopid=1334208588&tag_filter=&type=5&variation_filters=",
    method: "GET",
    headers: {
      // Add cookies or other headers here when needed
      Cookie:
        "__LOCALE__null=VN; SPC_F=90qmgJaG8zJh7O3LWvh2QBNCLW3V1gb3; REC_T_ID=1a87b2f7-552c-11ef-89e8-fe548e4357d9; csrftoken=kjELtpvyqVOBEFmuzNJHAKvgyHGwNC9U; _sapid=e75301c3ad79b5a5e20ecdc1ad0eb0105731493773804a98dec7fabf; _QPWSDCXHZQA=a5ef4ad1-1c2f-406c-8c49-f6c49bf30657; REC7iLP4Q=aba522a3-85a8-47ac-9f01-f52fc35e328c; __snaker__id=5mQj0DkesaGJFnMk; SPC_SI=aH7yZgAAAABOYnMwOXFTWdeUoAYAAAAAU0hpbUx5TDk=; _gcl_au=1.1.350502804.1731383803; _fbp=fb.1.1731383803107.436456300345547343; _gid=GA1.2.1763764517.1731383805; _hjSessionUser_868286=eyJpZCI6IjQzNmM1Yzc4LThkNjctNTQ2Yy04NDFlLWMyYzhjZjU4ZDdiZiIsImNyZWF0ZWQiOjE3MzEzODM4MDM1OTIsImV4aXN0aW5nIjp0cnVlfQ==; _gcl_gs=2.1.k1$i1731384222$u192717416; _med=cpc; _gcl_aw=GCL.1731384224.Cj0KCQiA88a5BhDPARIsAFj595h5G2tvapCUsV-0V6SMylVUfFHcIRaYf44bDCotezo1yuIDkc27y_EaAs9kEALw_wcB; _gac_UA-61914164-6=1.1731384224.Cj0KCQiA88a5BhDPARIsAFj595h5G2tvapCUsV-0V6SMylVUfFHcIRaYf44bDCotezo1yuIDkc27y_EaAs9kEALw_wcB; SPC_EC=.Rk5SQnJ1MXhNODVEM21IOdrXwyvZoGcamGFeY44XvXXq6ii9ZUGdTFRvH1MCB+9O+lJW4/eOI8IsLeUK7seKC/wvivIOVQn908gdKgwgGOzyvEPVs59L4zFvC+6LHhicsEB5Y8O4jVV2S6qb3AYO7YDfmMKqkPJCW6XGIgwsKtjgNe4L6nczlUxGS9vnyQQuw7s1HEDLsTtmy7kXmme49zsHX3HY+IdcMTaz4vJfxik=; SPC_ST=.Rk5SQnJ1MXhNODVEM21IOdrXwyvZoGcamGFeY44XvXXq6ii9ZUGdTFRvH1MCB+9O+lJW4/eOI8IsLeUK7seKC/wvivIOVQn908gdKgwgGOzyvEPVs59L4zFvC+6LHhicsEB5Y8O4jVV2S6qb3AYO7YDfmMKqkPJCW6XGIgwsKtjgNe4L6nczlUxGS9vnyQQuw7s1HEDLsTtmy7kXmme49zsHX3HY+IdcMTaz4vJfxik=; SPC_CLIENTID=OTBxbWdKYUc4ekpoerxebgkkdadxdznw; SPC_U=250507461; SPC_T_ID=B3WypeLeQzkEXP1EmXS5N6Bnj9eZRzsfXVHkDpAtiO+fegt0P5OelFm6+FDtjvg5vCkkuu4J2GzT49HYKOy1CsZ3ywIi9D2Jt8n3X4fuAkvZ7bbKH17qEm3qD/KsFR0jjZxhD5k7V0guJVORnJSfDAPru97x7fl0GRHQHcZ7lZc=; SPC_T_IV=bkRNQklnMDlnZ1RlYXdGdA==; SPC_R_T_ID=B3WypeLeQzkEXP1EmXS5N6Bnj9eZRzsfXVHkDpAtiO+fegt0P5OelFm6+FDtjvg5vCkkuu4J2GzT49HYKOy1CsZ3ywIi9D2Jt8n3X4fuAkvZ7bbKH17qEm3qD/KsFR0jjZxhD5k7V0guJVORnJSfDAPru97x7fl0GRHQHcZ7lZc=; SPC_R_T_IV=bkRNQklnMDlnZ1RlYXdGdA==; SPC_CDS_CHAT=a63b1eee-8f98-4320-91bb-19b62495539d; SPC_IA=1; SPC_SC_TK=d63235ef534df564a07f916877d03bec; SPC_SC_UD=250507461; SPC_SC_SESSION=d25e1836581f2669d76f436fc1f317d1_1_250507461; SPC_STK=xqc/xXFDzA3e3EJOAzJeGuvfljYNvJw3bBfrK21hTNnKO2ICmgXxj6XF+pM0QvKbl4V8nRDMlEPg9OPvyZktc7dVWeOZIX3smrvwZawKKz500eYPTz7e7nq5+mHcnIJ/Siyugx9eazFl8EzPPoxQayeQwBAMRYxZI8yFcfB3dWrFqeEnYagy3K7LINoE2VpF6iawAQON9bX+EaxnpAUDQQ==; SC_DFP=jvgFprJoXAzDlBFsXYApTSJqsdbyllFv; CTOKEN=sVr%2BSKEOEe%2BTaL7TlaBtcg%3D%3D; SPC_SEC_SI=v1-M1JlcmM1S3l1anlyN2gzRSbHSCx4eM1C5KJ5JZ8kKlnTYssWjX/ERDxB8eheV5MR7M2YNLtmpFQ1NQofdFhdxsIgRdA5J7FxXUiSYB/G/2M=; _ga=GA1.2.551448049.1723083341; _ga_4GPP1ZXG63=GS1.1.1731513243.9.1.1731513754.54.0.0; shopee_webUnique_ccd=u5oUlY1B%2FD65vIVGXlPHOA%3D%3D%7CC0TgypPpn9ubcS%2FBBBpJYr3BUWA7DEdMv0rfXhhiIhjw1dBZJ0V4Zez%2BjTmr8C3nkkCqlVS41mo%3D%7C7GtdUz%2BS0semWNGx%7C08%7C3; ds=d7853b0deba3fd8e0b9ccc164b2a7059",
    },
  };

  https
    .get(options, (response) => {
      let data = "";

      // Listen for data chunks
      response.on("data", (chunk) => {
        data += chunk;
      });

      // End of response
      response.on("end", () => {
        try {
          const jsonData = JSON.parse(data);
          res.json(jsonData);
        } catch (error) {
          console.error("Error parsing JSON:", error);
          res.status(500).json({ message: "Error parsing JSON response" });
        }
      });
    })
    .on("error", (error) => {
      console.error("Error fetching data:", error);
      res.status(500).json({ message: "Error fetching data from Shopee API" });
    });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
