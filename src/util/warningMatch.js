const warningMatch = observe => {
    const findWarning = observe.filter(element => {
        return element
            ? element.msgLevel
                ? element.msgLevel === 'warning'
                : true
            : true
    })
    return findWarning.length > 0
}

export default warningMatch 