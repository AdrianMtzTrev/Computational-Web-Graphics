

var list = document.getElementById("idLista")
var txtDato = document.getElementById("txtDato")
var form = document.getElementById("idForm")
var arry = []

const radios = document.querySelectorAll('.grupo-radio')

radios.forEach(radio => {
    radio.addEventListener('change', function () {
        if (this.checked) {
            radios.forEach(r => {
                if (r !== this) {
                    r.checked = false;
                }
            });
        }
    });
});

form.addEventListener("submit", function (e) {
    e.preventDefault()
    arry.push(txtDato.value)

    list.replaceChildren()

    for (let i = 0; i < arry.length; i++) {
        var item = document.createElement("li")
        var text = document.createTextNode(arry[i])
        item.appendChild(text)
        list.appendChild(item)
    }
    localStorage.setItem("arregloAlmacenadoLocal",arry)
    var arreglo2 = localStorage.getItem("arregloAlmacenadoLocal")
    //alert(arreglo2)
    //sessionStorage.setItem("arregloAlmacenadoSesion",arry)
    //var arreglo = sessionStorage.getItem("arregloAlmacenadoSesion")
    //alert(arreglo)
    txtDato.value = ""
})