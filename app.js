const express = require("express");
const app = express();
const uuid = require("uuid").v4;
const path = require('path')
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken");
const fs = require('fs');
const req = require("express/lib/request");
const NodeCache = require( "node-cache" );
const myCache = new NodeCache(); 


app.use(express.json())
app.listen(8001)
let parsedInventorydata;
let inventoryfile;
let  parsedPOdata 

app.post('/register', async (request,response) =>{
    const usercreds = request.body
    const {username, password}= usercreds
    const hashedPassword = await bcrypt.hash(password, 10)

    fs.readFile('./registeredUsers.json','utf-8',(err,jsonString)=>{
       
        let c = true;
        let registeredUsersdata = JSON.parse(jsonString)
        
        registeredUsersdata.forEach(element =>{
            if (element.username===username){
                c = false
                response.send("Username Already taken")
            }
    
        })
        if (c){
             
        const newUser = {"username":username,"password":hashedPassword}
        registeredUsersdata.push(newUser)
  

        fs.writeFile('./registeredUsers.json',JSON.stringify(registeredUsersdata), (err,jsonString)=>{
            response.send("Completed") 
        })  
    }


    })

})


const UserLoginCheck = (request, response, next) =>{
    const { username } = request.body;
   
    fs.readFile('./registeredUsers.json','utf-8',(err,jsonString)=>{
        let registeredUsersdata = JSON.parse(jsonString)
        let user = registeredUsersdata.find(element =>(element.username===username))

        if (user===undefined){
            
            resonse.send("The user is not registered")
        }else{
            request.user = user
            next()
        }
    })
}

const PasswordLoginCheck = async (request, response, next) =>{
   
    const user  = request.user 
    const {password} = request.body 
    const passwordcheck = await bcrypt.compare(password,user.password)
    if (passwordcheck===true){
        next()
    }else{
        response.send("Password didnt match")
    }
}


app.post("/login", UserLoginCheck, PasswordLoginCheck, (request, response) => {
    const { username, password } = request.body;
    const payload = { username: username };
    const jwtToken = jwt.sign(payload, "abcd");
    response.send({ jwtToken: jwtToken });
  });


const JwtTokenValidation = async (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
  
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
  
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "abcd", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          request.username = payload.username;
          next();
        }
      });
    }
  };

app.post("/addItem",JwtTokenValidation ,(request,response)=>{

    fs.readFile('./database.json','utf-8',(err,jsonString)=>{

        parsedInventorydata = JSON.parse(jsonString)
    
        const  {NameoftheItem,Quantity} = request.body

        let check = parsedInventorydata.find(eachItem =>(eachItem.itemName.toLowerCase()===NameoftheItem.toLowerCase()))

        if (check !== undefined){

        let NewList = parsedInventorydata.map(eachItem =>{

            if (eachItem.itemName.toLowerCase()===NameoftheItem.toLowerCase()){
             
                eachItem.Quantity =eachItem.Quantity+Quantity
                return eachItem
            }
            return eachItem
        })
        fs.writeFile('./database.json',JSON.stringify(NewList), (err,jsonString)=>{
            response.send("Completed") 
        })  
    }
    else{
        const newItem = {
                
            "itemName": NameoftheItem.toLowerCase(),
            "Quantity":Quantity
        }
        
        parsedInventorydata.push(newItem)

        fs.writeFile('./database.json',JSON.stringify(parsedInventorydata), (err,jsonString)=>{
            response.send("Completed")
            
        })
    }
    })

})


app.post("/addpo", JwtTokenValidation, (request,response) =>{
    fs.readFile('./database.json','utf-8',(err,jsonString)=>{

        parsedInventorydata = JSON.parse(jsonString)

        const InventoryList = parsedInventorydata.map(eachItem =>(eachItem.itemName))
        let x= Boolean(true)
        const orderDetails = request.body
        const outOfStack = orderDetails.map(eachItem =>{
                if (InventoryList.includes(eachItem.NameoftheItem.toLowerCase())){
                    const object  =  parsedInventorydata.find(eachobject =>(eachobject.itemName === eachItem.NameoftheItem.toLowerCase()))
                    const availableQuantity = object.Quantity
                    if (availableQuantity<eachItem.Quantity){
                        x=Boolean(false)
                        return {itemName:object.itemName,available:availableQuantity}
                    }
                    else{
                        return {itemName:object.itemName,available:eachItem.Quantity}
                    }
                }else{
                    x=Boolean(false)
                    return {itemName:eachItem.NameoftheItem.toLowerCase(),available:0}
                }

        })
        if(x){
            fs.readFile('./Purchaseorder.json','utf-8',(err,jsonString)=>{
                 parsedPOdata = JSON.parse(jsonString)

        global.poId
        fs.readFile('./poid.json','utf-8',(err,jsonString1)=>{
            global.poId = JSON.parse(jsonString1)[0].currentpoid
            
            const newpoid = [{"currentpoid":poId+1}]
            fs.writeFile('./poid.json',JSON.stringify(newpoid), (err,jsonString)=>{
               
            }) 

            const podetails = {
                "id":poId,
                "order":outOfStack,
                "status":"order placed"
            }
            parsedPOdata.push(podetails)

            fs.writeFile('./Purchaseorder.json',JSON.stringify(parsedPOdata), (err,jsonString)=>{
               
            }) 
            
        }) })
    
        for (eachItem of outOfStack) {
            parsedInventorydata = parsedInventorydata.map(element =>{
                if (element.itemName === eachItem.itemName){
                    let tempout=element.Quantity-eachItem.available
                    return {"itemName":element.itemName,"Quantity" :tempout }
                }
                else {return element}
        })
        }
        fs.writeFile('./database.json',JSON.stringify(parsedInventorydata), (err,jsonString)=>{
            
        })         
        }
        response.send(outOfStack)
    });
    } 
    )     


app.get('/search' , JwtTokenValidation, (request,response) =>{
    fs.readFile('./database.json','utf-8',(err,jsonString)=>{

        parsedInventorydata = JSON.parse(jsonString)

        const {searchInput} = request.body

        const searchResult = parsedInventorydata.filter(eachItem =>(eachItem.itemName.toLowerCase().includes(searchInput.toLowerCase())))
       
        response.send(searchResult)
    })

})


app.get('/orderstatus', JwtTokenValidation, (request,response)=>{
    const orderId = request.body.id
    fs.readFile('./Purchaseorder.json','utf-8',(err,jsonString)=>{
        

        purchaseordersdata = JSON.parse(jsonString)

        const requesteddata =  purchaseordersdata.find(element =>(
            element.id === orderId
        ))

           
        if (requesteddata===undefined){
            response.send("not Found")
        } else{   
            response.send(requesteddata.status)
        }
    })
})
