const express = new require("express")

const app = express()

app.get('/', (req, res) => {
    res.get('./index.html')
})

app.listen(8080, () => {
    
})